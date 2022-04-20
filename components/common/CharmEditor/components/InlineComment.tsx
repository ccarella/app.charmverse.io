import { RawPlugins, RawSpecs, Plugin } from '@bangle.dev/core';
import { Schema, DOMOutputSpec, Command, toggleMark, EditorState, PluginKey } from '@bangle.dev/pm';
import { useEditorViewContext, usePluginState } from '@bangle.dev/react';
import { filter, isMarkActiveInSelection } from '@bangle.dev/utils';
import { useTheme } from '@emotion/react';
import { Box, Button, ClickAwayListener, ListItem, TextField, Typography } from '@mui/material';
import List from '@mui/material/List';
import { useThreads } from 'hooks/useThreads';
import { createPortal } from 'react-dom';
import { ReviewerOption } from 'components/common/form/InputSearchContributor';
import { useState } from 'react';
import styled from '@emotion/styled';
import charmClient from 'charmClient';
import { hideSuggestionsTooltip, renderSuggestionsTooltip, SuggestTooltipPluginKey, SuggestTooltipPluginState } from './@bangle.dev/tooltip/suggest-tooltip';

const name = 'inline-comment';

const getTypeFromSchema = (schema: Schema) => schema.marks[name];

export function highlightSpec (): RawSpecs {
  return {
    type: 'mark',
    name,
    schema: {
      attrs: {
        id: {
          default: null
        }
      },
      parseDOM: [
        {
          tag: 'span.charm-inline-comment'
        }
      ],
      toDOM: (): DOMOutputSpec => ['span', { class: 'charm-inline-comment' }]
    },
    markdown: {
      // TODO: Fix convert to markdown
      toMarkdown: {
        open: '**',
        close: '**',
        mixable: true,
        expelEnclosingWhitespace: true
      },
      parseMarkdown: {
        strong: { mark: name }
      }
    }
  };
}

export const InlineCommentPluginKey = new PluginKey('inlineCommentPluginKey');
export function inlineCommentPlugin (): RawPlugins {
  return [
    new Plugin({
      props: {
        handleClickOn: (view) => {
          const { $from } = view.state.selection;
          const node = $from.nodeAfter;
          if (node) {
            const inlineCommentMark = view.state.doc.type.schema.marks['inline-comment'].isInSet(node.marks);
            if (inlineCommentMark && inlineCommentMark.attrs.id) {
              renderSuggestionsTooltip(SuggestTooltipPluginKey, {
                component: 'inlineComment',
                threadId: inlineCommentMark.attrs.id
              })(view.state, view.dispatch, view);
            }
          }
          return true;
        }
      }
    })
  ];
}

const ContextBorder = styled.div`
  width: 3px;
  height: 22px;
  border-radius: 3px;
  margin-left: 2px;
  margin-right: 8px;
  background: rgba(255, 212, 0, 0.8);
  flex-shrink: 0;
  padding-bottom: 2px;
`;

export function InlineCommentThread () {
  const { threads, setThreads } = useThreads();
  const view = useEditorViewContext();
  const {
    tooltipContentDOM,
    show: isVisible,
    component,
    threadId
  } = usePluginState(SuggestTooltipPluginKey) as SuggestTooltipPluginState;

  const thread = threadId && threads[threadId];
  const theme = useTheme();
  const [commentText, setCommentText] = useState('');

  async function addComment () {
    if (thread) {
      const comment = await charmClient.addComment({
        content: commentText,
        threadId: thread.id
      });

      setCommentText('');

      setThreads((_threads) => ({ ..._threads,
        [thread.id]: {
          ...thread,
          Comment: [...thread.Comment, comment]
        } }));
    }
  }

  if (isVisible && component === 'inlineComment' && thread) {
    return createPortal(
      <ClickAwayListener onClickAway={() => {
        hideSuggestionsTooltip(SuggestTooltipPluginKey)(view.state, view.dispatch, view);
      }}
      >
        <Box p={2} sx={{ background: theme.palette.background.light, minWidth: 500 }}>
          {thread.Comment.map((comment, commentIndex) => {
            return (
              <List key={comment.id}>
                <ListItem sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: 0,
                  gap: 1
                }}
                >
                  <Box sx={{
                    display: 'flex',
                    gap: 1
                  }}
                  >
                    <ReviewerOption user={comment.user as any} avatarSize='small' />
                    <Typography color='secondary' variant='subtitle1' display='flex' flexDirection='row'>
                      {new Date(comment.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  {commentIndex === 0 && (
                    <Box pl={4} display='flex'>
                      <ContextBorder />
                      <Typography fontWeight={600} color='secondary'>{thread.context}</Typography>
                    </Box>
                  )}
                  <Typography pl={4}>{comment.content}</Typography>
                </ListItem>
              </List>
            );
          })}
          <Box display='flex' gap={1} mt={1}>
            <TextField placeholder='Add a comment...' fullWidth size='small' onChange={(e) => setCommentText(e.target.value)} value={commentText} />
            <Button onClick={() => addComment()}>Add</Button>
          </Box>
        </Box>
      </ClickAwayListener>,
      tooltipContentDOM
    );
  }
  return null;
}

export function toggleInlineComment (): Command {
  return (state, dispatch) => {
    return toggleMark(getTypeFromSchema(state.schema))(state, dispatch);
  };
}

export function queryIsInlineCommentActive () {
  return (state: EditorState) => isMarkActiveInSelection(getTypeFromSchema(state.schema))(state);
}

export function createInlineComment () {
  return filter(
    (state) => queryIsInlineCommentAllowedInRange(
      state.selection.$from.pos,
      state.selection.$to.pos
    )(state),
    (state, dispatch) => {
      const [from, to] = [state.selection.$from.pos, state.selection.$to.pos];
      const linkMark = state.schema.marks.link;
      const tr = state.tr.removeMark(from, to, linkMark);
      const inlineCommentMark = state.schema.marks['inline-comment'].create({
        id: null
      });
      tr.addMark(from, to, inlineCommentMark);

      if (dispatch) {
        dispatch(tr);
      }
      return true;
    }
  );
}

function isTextAtPos (pos: number) {
  return (state: EditorState) => {
    const node = state.doc.nodeAt(pos);
    return !!node && node.isText;
  };
}

function setInlineComment (from: number, to: number, id?: string) {
  return filter(
    (state) => isTextAtPos(from)(state),
    (state, dispatch) => {
      const inlineCommentMark = state.schema.marks['inline-comment'];
      const tr = state.tr.removeMark(from, to, inlineCommentMark);
      const mark = state.schema.marks['inline-comment'].create({
        id
      });
      tr.addMark(from, to, mark);
      if (dispatch) {
        dispatch(tr);
      }
      return true;
    }
  );
}

export function updateInlineComment (id: string): Command {
  return (state, dispatch) => {
    if (!state.selection.empty) {
      return setInlineComment(
        state.selection.$from.pos,
        state.selection.$to.pos,
        id
      )(state, dispatch);
    }

    const { $from } = state.selection;
    const pos = $from.pos - $from.textOffset;
    const node = state.doc.nodeAt(pos);
    let to = pos;

    if (node) {
      to += node.nodeSize;
    }

    return setInlineComment(pos, to, id)(state, dispatch);
  };
}

export function queryIsInlineCommentAllowedInRange (from: number, to: number) {
  return (state: EditorState) => {
    const $from = state.doc.resolve(from);
    const $to = state.doc.resolve(to);
    const inlineCommentMark = state.schema.marks['inline-comment'];
    if ($from.parent === $to.parent && $from.parent.isTextblock) {
      return $from.parent.type.allowsMarkType(inlineCommentMark);
    }
  };
}

export function queryIsSelectionAroundInlineComment () {
  return (state: EditorState) => {
    const { $from, $to } = state.selection;
    const node = $from.nodeAfter;
    return (
      !!node
      && $from.textOffset === 0
      && $to.pos - $from.pos === node.nodeSize
      && !!state.doc.type.schema.marks['inline-comment'].isInSet(node.marks)
    );
  };
}


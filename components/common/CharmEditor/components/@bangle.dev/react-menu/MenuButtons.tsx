import {
  blockquote,
  bold,
  bulletList,
  code,
  heading,
  history,
  italic,
  link,
  orderedList,
  paragraph,
  strike,
  underline
} from '@bangle.dev/base-components';
import { EditorState, PluginKey } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';
import { BoldIcon, BulletListIcon, CodeIcon, ItalicIcon, LinkIcon, OrderedListIcon, ParagraphIcon, RedoIcon, TodoListIcon, UndoIcon } from '@bangle.dev/react-menu';
import { HintPos } from '@bangle.dev/react-menu/dist/types';
import {
  defaultKeys as floatingMenuKeys, focusFloatingMenuInput
} from '@bangle.dev/react-menu/floating-menu';
import { filter, rafCommandExec } from '@bangle.dev/utils';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import React, { useCallback } from 'react';
import { createInlineComment, queryIsInlineCommentActive, toggleInlineComment } from '../../InlineComment';
import { MenuButton } from './Icon';
import CommentIcon from '@mui/icons-material/Comment';
import { toggleSubMenu } from './floating-menu';

const {
  defaultKeys: orderedListKeys,
  queryIsOrderedListActive,
  toggleOrderedList,
} = orderedList;
const { defaultKeys: italicKeys, queryIsItalicActive, toggleItalic } = italic;
const { defaultKeys: historyKeys, undo, redo } = history;

const { defaultKeys: boldKeys, queryIsBoldActive, toggleBold } = bold;
const { defaultKeys: codeKeys, queryIsCodeActive, toggleCode } = code;
const { defaultKeys: underlineKeys, queryIsUnderlineActive, toggleUnderline } = underline;
const { defaultKeys: strikeKeys, queryIsStrikeActive, toggleStrike } = strike;
const {
  defaultKeys: paragraphKeys,
  queryIsTopLevelParagraph,
  convertToParagraph,
} = paragraph;
const {
  defaultKeys: headingKeys,
  queryIsHeadingActive,
  toggleHeading,
} = heading;

const { createLink, queryIsLinkActive } = link;
const {
  defaultKeys: bulletListKeys,
  queryIsBulletListActive,
  queryIsTodoListActive,
  toggleBulletList,
  toggleTodoList,
} = bulletList;

interface ButtonProps {
  hints?: string[];
  hintPos?: HintPos;
  children?: React.ReactNode;
}

export function BoldButton({
  hints = ['Bold', boldKeys.toggleBold],
  hintPos = 'top',
  children = <BoldIcon fontSize={16} />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleBold()(view.state, view.dispatch, view)) {
        view.focus();
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={queryIsBoldActive()(view.state)}
      isDisabled={!view.editable || !toggleBold()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function InlineCommentButton({
  hints = ['Inline comment'],
  hintPos = 'top',
  children = <CommentIcon sx={{
    fontSize: 12,
    position: "relative"
  }}/>,
  menuKey,
  ...props
}: ButtonProps & {menuKey: PluginKey}) {
  const view = useEditorViewContext();
  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const command = filter(
        (state: EditorState) => createInlineComment()(state),
        (_state, dispatch, view) => {
          if (dispatch) {
            toggleSubMenu("inlineCommentSubMenu")(view!.state, view!.dispatch, view);
            rafCommandExec(view!, focusFloatingMenuInput(menuKey));
          }
          return true;
        },
      );
      if (command(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view, menuKey],
  );

  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onMouseDown}
      hints={hints}
      // Figure out when the button will be disabled
      isDisabled={!view.editable || queryIsInlineCommentActive()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function StrikeButton({
  hints = ['Strike', strikeKeys.toggleStrike],
  hintPos = 'top',
  children = <span style={{ textDecoration: "line-through", fontSize: 18, marginLeft: 5, marginRight: 5 }}>S</span>,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleStrike()(view.state, view.dispatch, view)) {
        view.focus();
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={queryIsStrikeActive()(view.state)}
      isDisabled={!view.editable || !toggleStrike()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function UnderlineButton({
  hints = ['Underline', underlineKeys.toggleUnderline],
  hintPos = 'top',
  children = <span style={{ textDecoration: "underline", fontSize: 18, marginLeft: 5, marginRight: 5 }}>U</span>,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleUnderline()(view.state, view.dispatch, view)) {
        view.focus();
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={queryIsUnderlineActive()(view.state)}
      isDisabled={!view.editable || !toggleUnderline()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function CalloutButton({
  hints = ['Callout', blockquote.defaultKeys.wrapIn],
  hintPos = 'top',
  children = <ChatBubbleIcon sx={{
    fontSize: 12,
    top: 2,
    position: "relative"
  }}/>,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (
        blockquote.commands.wrapInBlockquote()(view.state, view.dispatch, view)
      ) {
        view.focus();
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={blockquote.commands.queryIsBlockquoteActive()(view.state)}
      isDisabled={
        !view.editable || !blockquote.commands.wrapInBlockquote()(view.state)
      }
    >
      {children}
    </MenuButton>
  );
}

export function ItalicButton({
  hints = ['Italic', italicKeys.toggleItalic],
  hintPos = 'top',
  children = <ItalicIcon fontSize={16} />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleItalic()(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={queryIsItalicActive()(view.state)}
      isDisabled={!view.editable || !toggleItalic()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function UndoButton({
  hints = ['Undo', historyKeys.undo],
  hintPos = 'top',
  children = <UndoIcon />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (undo()(view.state, view.dispatch)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isDisabled={!view.editable || !undo()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function RedoButton({
  hints = ['Redo', historyKeys.redo],
  hintPos = 'top',
  children = <RedoIcon />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (redo()(view.state, view.dispatch)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isDisabled={!view.editable || !redo()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function CodeButton({
  hints = ['Code', codeKeys.toggleCode],
  hintPos = 'top',
  children = <CodeIcon fontSize={16} />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleCode()(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={queryIsCodeActive()(view.state)}
      isDisabled={!view.editable || !toggleCode()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function BulletListButton({
  hints = ['BulletList', bulletListKeys.toggle],
  hintPos = 'top',
  children = <BulletListIcon />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleBulletList()(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isDisabled={!view.editable}
      isActive={
        queryIsBulletListActive()(view.state) &&
        !queryIsTodoListActive()(view.state)
      }
    >
      {children}
    </MenuButton>
  );
}

export function OrderedListButton({
  hints = ['Ordered list', orderedListKeys.toggle],
  hintPos = 'top',
  children = <OrderedListIcon />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleOrderedList()(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isDisabled={!view.editable}
      isActive={queryIsOrderedListActive()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function TodoListButton({
  hints = ['Todo list', bulletListKeys.toggleTodo],
  hintPos = 'top',
  children = <TodoListIcon />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();

      if (toggleTodoList()(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isDisabled={!view.editable}
      isActive={queryIsTodoListActive()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function HeadingButton({
  level,
  hints = [`Heading ${level}`, headingKeys['toH' + level] ?? "1"],
  hintPos = 'top',
  children = 
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fontSize={16}>
      <text
        x="12"
        y="12"
        stroke="currentColor"
        textAnchor="middle"
        alignmentBaseline="central"
        dominantBaseline="middle"
      >
        H{level}
      </text>
    </svg>,
  ...props
}: ButtonProps & { level: number }) {
  const view = useEditorViewContext();

  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (toggleHeading(level)(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view, level],
  );
  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={queryIsHeadingActive(level)(view.state)}
      isDisabled={!view.editable || !toggleHeading(level)(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function ParagraphButton({
  hints = [`Paragraph`, paragraphKeys.convertToParagraph],
  hintPos = 'top',
  children = <ParagraphIcon fontSize={16} />,
  ...props
}: ButtonProps) {
  const view = useEditorViewContext();
  const onSelect = useCallback(
    (e) => {
      e.preventDefault();
      if (convertToParagraph()(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view],
  );

  return (
    <MenuButton
      {...props}
      hintPos={hintPos}
      onMouseDown={onSelect}
      hints={hints}
      isActive={queryIsTopLevelParagraph()(view.state)}
      isDisabled={!view.editable || !convertToParagraph()(view.state)}
    >
      {children}
    </MenuButton>
  );
}

export function FloatingLinkButton({
  hints = ['Create a link', floatingMenuKeys.toggleLink],
  hintPos = 'top',
  children = <LinkIcon />,
  menuKey,
}: ButtonProps & { menuKey: PluginKey }) {
  const view = useEditorViewContext();

  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const command = filter(
        (state: EditorState) => createLink('')(state),
        (_state, dispatch, view) => {
          if (dispatch) {
            toggleSubMenu("linkSubMenu")(view!.state, view!.dispatch, view);
            rafCommandExec(view!, focusFloatingMenuInput(menuKey));
          }
          return true;
        },
      );
      if (command(view.state, view.dispatch, view)) {
        if (view.dispatch as any) {
          view.focus();
        }
      }
    },
    [view, menuKey],
  );

  return (
    <MenuButton
      onMouseDown={onMouseDown}
      hints={hints}
      hintPos={hintPos}
      isActive={queryIsLinkActive()(view.state)}
      isDisabled={!view.editable || !createLink('')(view.state)}
    >
      {children}
    </MenuButton>
  );
}
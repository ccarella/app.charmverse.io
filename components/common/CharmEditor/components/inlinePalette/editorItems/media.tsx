import { rafCommandExec } from '@bangle.dev/utils';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';

import { MAX_EMBED_WIDTH, VIDEO_ASPECT_RATIO } from 'lib/embed/constants';

import { insertNode, isAtBeginningOfLine } from '../../../utils';
import { palettePluginKey } from '../config';
import { replaceSuggestionMarkWith } from '../inlinePalette';
import type { PaletteItemTypeNoGroup } from '../paletteItem';

const iconSize = 30;

export function items (): PaletteItemTypeNoGroup[] {
  return [
    {
      uid: 'image',
      title: 'Image',
      icon: <ImageIcon
        sx={{ fontSize: iconSize }}
      />,
      description: 'Insert a image block in the line below',
      editorExecuteCommand: () => {
        return (state, dispatch, view) => {
          rafCommandExec(view!, (_state, _dispatch) => {
            const node = _state.schema.nodes.image.create({
              src: null
            });

            if (_dispatch && isAtBeginningOfLine(_state)) {
              _dispatch(_state.tr.replaceSelectionWith(node));
              return true;
            }

            return insertNode(_state, _dispatch, node);
          });
          return replaceSuggestionMarkWith(palettePluginKey, '')(
            state,
            dispatch,
            view
          );
        };
      }
    },
    {
      uid: 'video',
      title: 'Video',
      icon: <VideoLibraryIcon
        sx={{ fontSize: iconSize }}
      />,
      description: 'Insert a video block in the line below',
      editorExecuteCommand: () => {
        return (state, dispatch, view) => {
          if (view) {
            rafCommandExec(view, (_state, _dispatch) => {

              const node = _state.schema.nodes.iframe.create({
                src: null,
                type: 'video',
                width: MAX_EMBED_WIDTH,
                height: MAX_EMBED_WIDTH / VIDEO_ASPECT_RATIO
              });

              if (_dispatch && isAtBeginningOfLine(_state)) {
                _dispatch(_state.tr.replaceSelectionWith(node));
                return true;
              }

              return insertNode(_state, _dispatch, node);
            });

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view
            );
          }
          return false;
        };
      }
    },
    {
      uid: 'pdf',
      title: 'PDF',
      icon: <PictureAsPdfIcon
        sx={{ fontSize: iconSize }}
      />,
      description: 'Insert a PDF block in the line below',
      editorExecuteCommand: () => {
        return (state, dispatch, view) => {
          rafCommandExec(view!, (_state, _dispatch) => {
            const node = _state.schema.nodes.pdf.create({
              src: null

            });

            if (_dispatch && isAtBeginningOfLine(_state)) {
              _dispatch(_state.tr.replaceSelectionWith(node));
              return true;
            }
            return insertNode(_state, _dispatch, node);
          });
          return replaceSuggestionMarkWith(palettePluginKey, '')(
            state,
            dispatch,
            view
          );
        };
      }
    }
  ];
}

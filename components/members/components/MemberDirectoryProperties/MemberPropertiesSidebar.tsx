import styled from '@emotion/styled';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Box, ClickAwayListener, Collapse, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import type { MemberProperty } from '@prisma/client';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { SidebarHeader } from 'components/common/BoardEditor/focalboard/src/components/viewSidebar/viewSidebar';
import Button from 'components/common/Button';
import FieldLabel from 'components/common/form/FieldLabel';
import Modal from 'components/common/Modal';
import ConfirmDeleteModal from 'components/common/Modal/ConfirmDeleteModal';
import { MemberPropertySidebarDetails } from 'components/members/components/MemberDirectoryProperties/MemberPropertySidebarDetails';
import isAdmin from 'hooks/useIsAdmin';
import { useMemberProperties } from 'hooks/useMemberProperties';
import useRefState from 'hooks/useRefState';
import { DEFAULT_MEMBER_PROPERTIES } from 'lib/members/constants';
import type { MemberPropertyWithPermissions } from 'lib/members/interfaces';
import { mergeRefs } from 'lib/utilities/react';

import { AddMemberPropertyButton } from '../AddMemberPropertyButton';

import { MemberPropertyItem } from './MemberPropertyItem';
import type { PropertyOption } from './MemberPropertySelectInput';
import { MemberPropertySelectInput } from './MemberPropertySelectInput';

const StyledSidebar = styled.div`
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-left: 1px solid rgb(var(--center-channel-color-rgb), 0.12);
  display: flex;
  flex-direction: column;
  height: fit-content;
  min-height: 100%;
  width: 100%;
  ${({ theme }) => theme.breakpoints.up('md')} {
    width: 250px;
  }
`;

function MemberPropertyItemForm ({
  property,
  close
}: {
  property: MemberProperty;
  close: VoidFunction;
}) {
  const { updateProperty } = useMemberProperties();
  const [propertyName, setPropertyName] = useState('');
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>((property?.options as PropertyOption[]) ?? []);

  useEffect(() => {
    setPropertyName(property.name);
  }, []);

  const isSelectPropertyType = (property.type.match(/select/));

  const isDisabled = propertyName.length === 0
    || (isSelectPropertyType
      && (property.options as PropertyOption[])?.find(po => po.name.length === 0));

  async function onSubmit () {
    if (!isDisabled) {
      await updateProperty({
        name: propertyName,
        id: property.id,
        options: propertyOptions
      });
      setPropertyName('');
      close();
    }
  }
  return (
    <Stack gap={2}>
      <Stack>
        <FieldLabel>Name</FieldLabel>
        <TextField
          error={!propertyName}
          value={propertyName}
          onChange={(e) => {
            setPropertyName(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.code === 'Enter') {
              onSubmit();
            }
          }}
          autoFocus
        />
      </Stack>

      {isSelectPropertyType && (
        <MemberPropertySelectInput
          onChange={setPropertyOptions}
          options={propertyOptions}
        />
      )}
      <Button
        disabled={isDisabled}
        onClick={onSubmit}
        sx={{
          width: 'fit-content'
        }}
      >Update
      </Button>
    </Stack>
  );
}

export function MemberPropertySidebarItem ({
  property
}: {
  property: MemberPropertyWithPermissions;
}) {
  const [isAdjacent, isAdjacentRef, setIsAdjacent] = useRefState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [toggled, setToggled] = useState(false);
  const { updateProperty, deleteProperty, addPropertyPermissions, removePropertyPermission } = useMemberProperties();
  const propertyRenamePopupState = usePopupState({ variant: 'popover', popupId: 'property-rename-modal' });
  const admin = isAdmin();

  const [, drag, dragPreview] = useDrag(() => ({
    type: 'item',
    item: property
  }));

  const [{ canDrop, isOverCurrent }, drop] = useDrop<MemberPropertyWithPermissions, any, { canDrop: boolean, isOverCurrent: boolean }>(() => ({
    accept: 'item',
    drop: async (droppedProperty, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) {
        return;
      }
      if (isAdjacentRef.current) {
        await updateProperty({
          id: droppedProperty.id,
          index: property.index
        });
        setIsAdjacent(false);
      }
    },

    // listen to hover events to determine if the mouse is over the top portion of the node
    hover (_item: MemberPropertyWithPermissions, monitor) {
      if (!ref.current) {
        return;
      }
      const _isOverCurrent = monitor.isOver({ shallow: true });
      let _isAdjacent = true;

      if (_isOverCurrent) {
        // Determine element rectangle on screen
        const hoverBoundingRect = ref.current!.getBoundingClientRect();
        const topOfElement = hoverBoundingRect.top;
        const threshold = topOfElement + 5;

        // Determine mouse position
        const mouseY = monitor.getClientOffset()!.y;

        if (_isOverCurrent && mouseY < threshold) {
          _isAdjacent = true;
        }

      }
      setIsAdjacent(_isAdjacent);
    },
    collect: monitor => {
      let canDropItem: boolean = true;
      // We use this to bypass the thrown error: Invariant Violation: Expected to find a valid target.
      // If there is an error thrown, set canDrop to false.
      try {
        canDropItem = monitor.canDrop();
      }
      catch {
        canDropItem = false;
      }
      return {
        isOverCurrent: monitor.isOver({ shallow: true }),
        canDrop: canDropItem
      };
    }
  }), [property]);

  const deleteConfirmation = usePopupState({ variant: 'popover', popupId: 'delete-confirmation' });
  const isAdjacentActive = isAdjacent && canDrop && isOverCurrent;

  return (
    <Stack height='fit-content' ref={mergeRefs([ref, drag, drop, dragPreview])}>
      <MenuItem
        dense
        sx={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          '&:hover .icons': {
            opacity: 1
          },
          width: '100%',
          '& .MuiListItemIcon-root': {
            minWidth: 30
          },
          pl: 1,
          backgroundColor: isAdjacentActive ? 'action.focus' : 'unset'
        }}
        onClick={() => setToggled(!toggled)}
      >
        <ArrowRightIcon
          onClick={() => setToggled(!toggled)}
          sx={{
            transform: toggled ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease-in-out'
          }}
        />
        <MemberPropertyItem
          type={property.type}
          name={property.name}
        />
        {admin && (
          <Box
            display='flex'
            gap={0.5}
            className='icons'
            sx={{
              opacity: 0
            }}
          >
            <Tooltip title={`Edit ${property.name} property.`}>
              <EditIcon
                cursor='pointer'
                fontSize='small'
                color='secondary'
                onClick={(e) => {
                  e.stopPropagation();
                  propertyRenamePopupState.open();
                }}
              />
            </Tooltip>
            {!DEFAULT_MEMBER_PROPERTIES.includes(property.type as any) && (
              <Tooltip title={`Delete ${property.name} property.`}>
                <DeleteIcon
                  cursor='pointer'
                  fontSize='small'
                  color='secondary'
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConfirmation.open();
                  }}
                />
              </Tooltip>
            )}
            <ConfirmDeleteModal
              title='Delete property'
              question='Are you sure you want to delete this property?'
              onConfirm={() => {
                deleteProperty(property.id);
              }}
              onClose={deleteConfirmation.close}
              open={deleteConfirmation.isOpen}
            />
          </Box>
        )}
      </MenuItem>
      <MemberPropertySidebarDetails
        isExpanded={toggled}
        readOnly={!admin}
        property={property}
        addPermissions={addPropertyPermissions}
        removePermission={removePropertyPermission}
      />
      <Modal size='large' open={propertyRenamePopupState.isOpen} onClose={propertyRenamePopupState.close} title={`Update ${property.name}`}>
        <MemberPropertyItemForm
          close={propertyRenamePopupState.close}
          property={property}
        />
      </Modal>
    </Stack>
  );
}

export function MemberPropertiesSidebar ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { properties } = useMemberProperties();

  return properties ? (
    <ClickAwayListener mouseEvent='onClick' onClickAway={onClose}>
      <Collapse in={isOpen} orientation='horizontal' sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 1000, height: 'fit-content', marginBottom: 1 }}>
        <StyledSidebar>
          <SidebarHeader
            closeSidebar={onClose}
            title='Properties'
          />
          <Stack height='fit-content'>
            {properties.map(property => <MemberPropertySidebarItem property={property} key={property.id} />)}
          </Stack>
          <AddMemberPropertyButton />
        </StyledSidebar>
      </Collapse>
    </ClickAwayListener>
  ) : null;
}

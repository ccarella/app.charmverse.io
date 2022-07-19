// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { ButtonProps } from '@mui/material'
import { Box } from '@mui/system'
import { Bounty } from '@prisma/client'
import charmClient from 'charmClient'
import BountyEditorForm from 'components/bounties/components/BountyEditorForm'
import BountyDetails from 'components/bounties/[bountyId]/BountyDetails'
import Button from "components/common/Button"
import BountyIntegration from 'components/[pageId]/DocumentPage/components/BountyIntegration'
import { useBounties } from 'hooks/useBounties'
import { useCurrentSpace } from 'hooks/useCurrentSpace'
import { useCurrentSpacePermissions } from 'hooks/useCurrentSpacePermissions'
import { usePages } from 'hooks/usePages'
import { useUser } from 'hooks/useUser'
import { BountyWithDetails } from 'models'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Board } from '../blocks/board'
import mutator from '../mutator'
import { getCard } from '../store/cards'
import { useAppSelector } from '../store/hooks'
import { Utils } from '../utils'
import DeleteIcon from '../widgets/icons/delete'
import LinkIcon from '../widgets/icons/Link'
import Menu from '../widgets/menu'
import CardDetail from './cardDetail/cardDetail'
import ConfirmationDialogBox, { ConfirmationDialogBoxProps } from './confirmationDialogBox'
import Dialog from './dialog'
import { sendFlashMessage } from './flashMessages'

type Props = {
    board: Board
    cardId: string
    onClose: () => void
    showCard: (cardId?: string) => void
    readonly: boolean
    bounty?: BountyWithDetails
}

function CreateBountyButton (props: Pick<Bounty, "linkedTaskId" | "title">) {
  const { linkedTaskId, title } = props;
  const { setBounties } = useBounties();
  const [user] = useUser();
  const [space] = useCurrentSpace();

  const [userSpacePermissions] = useCurrentSpacePermissions();

  return (
    <Box sx={{
      whiteSpace: 'nowrap'
    }}
    >
      {!userSpacePermissions?.createBounty || !space || !user ? null : (
        <Button onClick={async () => {
          const createdBounty = await charmClient.createBounty({
            chainId: 1,
            status: "open",
            spaceId: space.id,
            createdBy: user.id,
            rewardAmount: 1,
            rewardToken: "ETH",
            linkedTaskId,
            title
          })
          setBounties((bounties) => [...bounties, {...createdBounty, applications: []}])
        }}>
          Create bounty
        </Button>
      )}
    </Box>
  );
}

const CardDialog = (props: Props): JSX.Element | null => {
  const { cardId, readonly, onClose, bounty } = props;
    const card = useAppSelector(getCard(cardId))
    const intl = useIntl()
    const [showConfirmationDialogBox, setShowConfirmationDialogBox] = useState<boolean>(false)
    const { pages } = usePages()
    const router = useRouter();
    const isSharedPage = router.route.startsWith('/share')
    const cardPage = pages[cardId]
    
    const handleDeleteCard = async () => {
        if (!card) {
            Utils.assertFailure()
            return
        }
        // TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.DeleteCard, {board: props.board.id, view: props.activeView.id, card: card.id})
        await mutator.deleteBlock(card, 'delete card')
        onClose()
    }

    const confirmDialogProps: ConfirmationDialogBoxProps = {
        heading: intl.formatMessage({id: 'CardDialog.delete-confirmation-dialog-heading', defaultMessage: 'Confirm card delete?'}),
        confirmButtonText: intl.formatMessage({id: 'CardDialog.delete-confirmation-dialog-button-text', defaultMessage: 'Delete'}),
        onConfirm: handleDeleteCard,
        onClose: () => {
            setShowConfirmationDialogBox(false)
        },
    }

    const handleDeleteButtonOnClick = () => {
        // use may be renaming a card title
        // and accidently delete the card
        // so adding des
        if (card?.title === '' && card?.fields.contentOrder.length === 0) {
            handleDeleteCard()
            return
        }

        setShowConfirmationDialogBox(true)
    }

    const menu = <>
          <Menu position='bottom-end'>
              <Menu.Text
                  id='delete'
                  icon={<DeleteIcon/>}
                  name='Delete'
                  onClick={handleDeleteButtonOnClick}
              />
              <Menu.Text
                  icon={<LinkIcon/>}
                  id='copy'
                  name={intl.formatMessage({id: 'CardDialog.copyLink', defaultMessage: 'Copy link'})}
                  onClick={() => {
                      let cardLink = window.location.href

                      const queryString = new URLSearchParams(window.location.search)
                      if (queryString.get('cardId') !== card!.id) {
                          const newUrl = new URL(window.location.toString())
                          newUrl.searchParams.set('cardId', card!.id)
                          cardLink = newUrl.toString()
                      }

                      Utils.copyTextToClipboard(cardLink)
                      sendFlashMessage({content: intl.formatMessage({id: 'CardDialog.copiedLink', defaultMessage: 'Copied!'}), severity: 'high'})
                  }}
              />
          </Menu>
    </>

    return card && pages[card.id] ? (
        <>
            <Dialog
                onClose={onClose}
                toolsMenu={!readonly && menu}
                hideCloseButton
                toolbar={!isSharedPage && (
                    <Box display="flex" justifyContent={"space-between"}>
                      <Button
                        size='small'
                        color='secondary'
                        href={`/${router.query.domain}/${pages[card.id]!.path}`}
                        variant='text'
                        startIcon={<OpenInFullIcon fontSize='small'/>}>
                        Open as Page
                      </Button>
                      {cardPage && !bounty && !readonly && <CreateBountyButton linkedTaskId={cardId} title={cardPage.title} />}
                    </Box>
                  )
                }
            >
                {card && card.fields.isTemplate &&
                    <div className='banner'>
                        <FormattedMessage
                            id='CardDialog.editing-template'
                            defaultMessage="You're editing a template."
                        />
                    </div>}
                {card &&
                    <CardDetail
                        card={card}
                        readonly={readonly || isSharedPage}
                        // bountyEditor={
                        //   isEditingBounty ? 
                        //   <BountyEditorForm 
                        //     onSubmit={() => {
                        //       setIsEditingBounty(false)
                        //     }}
                        //     mode={"create"}
                        //     onCancel={() => setIsEditingBounty(false)}
                        //     bounty={{
                        //       title: cardPage?.title,
                        //       description: undefined,
                        //       descriptionNodes: undefined,
                        //       linkedTaskId: cardPage?.id,
                        //       rewardAmount: 1,
                        //       rewardToken: "ETH",
                        //       chainId: 1,
                        //     }}
                        //   /> :
                        //   bounty ? <BountyDetails 
                        //     centeredContent={false}
                        //     bounty={bounty}
                        //     showDescription={false}
                        //     showHeader={false}
                        //   /> : null
                        // }
                    />}

                {!card &&
                    <div className='banner error'>
                        <FormattedMessage
                            id='CardDialog.nocard'
                            defaultMessage="This card doesn't exist or is inaccessible."
                        />
                    </div>}
            </Dialog>
            
            {showConfirmationDialogBox && <ConfirmationDialogBox dialogBox={confirmDialogProps}/>}
        </>
    ) : null
}
export default CardDialog

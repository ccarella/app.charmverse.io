import PageDialog from 'components/common/PageDialog';
import { useBounties } from 'hooks/useBounties';
import { usePages } from 'hooks/usePages';
import { useMemo } from 'react';
import { getCard } from '../store/cards';
import { useAppSelector } from '../store/hooks';

type Props = {
  cardId: string
  onClose: () => void
  showCard: (cardId?: string) => void
  readOnly: boolean
}

const CardDialog = (props: Props): JSX.Element | null => {
  const { cardId, readOnly, onClose } = props;
  const card = useAppSelector(getCard(cardId))
  const { pages } = usePages()
  const { bounties } = useBounties()
  const cardPage = pages[cardId]
  const bounty = useMemo(() => {
    return bounties.find(bounty => bounty.page?.id === cardId) ?? null
  }, [cardId, bounties.length])

  return card && pages[card.id] ? (
    <>
      <PageDialog
        onClose={onClose}
        readOnly={readOnly}
        bounty={bounty}
        page={cardPage}
      />
    </>
  ) : null
}
export default CardDialog;

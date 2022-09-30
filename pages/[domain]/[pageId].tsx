
import getPageLayout from 'components/common/PageLayout/getLayout';
import EditorPage from 'components/[pageId]/EditorPage/EditorPage';
import { usePages } from 'hooks/usePages';
import type { PageMeta } from 'lib/pages';
import { useRouter } from 'next/router';

export default function BlocksEditorPage () {

  const { pages } = usePages();
  const router = useRouter();

  const pagePath = router.query.pageId as string;
  const pageIdList = Object.values(pages ?? {}) as PageMeta[];
  const pageId = pageIdList.find(p => p.path === pagePath)?.id;

  if (!pageId) {
    return null;
  }

  return <EditorPage pageId={pageId ?? pagePath} />;

}

BlocksEditorPage.getLayout = getPageLayout;

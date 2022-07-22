import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Page } from '@prisma/client';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { getKey } from 'hooks/useLocalStorage';
import { usePages } from 'hooks/usePages';
import { sortNodes, filterVisiblePages } from 'components/common/PageLayout/components/PageNavigation/PageNavigation';

// Redirect users to an initial page
export default function RedirectToMainPage () {
  const router = useRouter();
  const [space] = useCurrentSpace();
  const { pages } = usePages();
  const defaultPageKey: string = space?.domain ? getKey(`last-page-${space.domain}`) : '';
  const defaultPage = defaultPageKey ? (typeof window !== 'undefined' && localStorage.getItem(defaultPageKey)) : null;
  const staticCommonPages = ['bounties', 'votes', 'settings/workspace', 'settings/contributors', 'settings/roles', 'settings/payment-methods'];

  useEffect(() => {
    const isCommonDefaultPage = defaultPage && staticCommonPages.some(page => defaultPage.includes(`/${page}`));
    const isDynamicDefaultPage = !isCommonDefaultPage && defaultPage && Object.values(pages).some(page => page && defaultPage.includes(`/${page.path}`));

    if (isCommonDefaultPage || isDynamicDefaultPage) {
      router.push(defaultPage);
    }
    else {
      // Find the first top-level page that is not card and hasn't been deleted yet.
      const topLevelPages = filterVisiblePages(Object.values(pages))
        // Remove any child pages (eg. that have a parentId)
        .filter(page => !page?.parentId);

      const sortedPages = sortNodes(topLevelPages);

      const firstPage = sortedPages[0] as Page;

      // make sure this page is part of this space in case user is navigating to a new space
      if (firstPage && space && firstPage?.spaceId === space.id) {
        router.push(`/${space.domain}/${firstPage.path}`);
      }
    }

  }, [space, pages]);

  return null;
}

import { Thread, Comment } from '@prisma/client';

export enum ThreadStatus {
  open,
  closed
}

export type ThreadStatusType = keyof typeof ThreadStatus

export interface ThreadStatusUpdate {
  id: string;
  status: ThreadStatusType
}

/**
 * @context Prosemirror content for knowing where to display this thread inside the CharmEditor
 */
export interface ThreadCreate {
  comment: string;
  pageId: string;
  userId: string;
  context: string;
}

export interface ThreadWithComments extends Thread {
  comments: Comment[]
}


import { prisma } from 'db';
import * as emails from 'lib/emails';
import type { PendingTasksProps } from 'lib/emails/templates/PendingTasks';
import type { GnosisSafeTasks } from 'lib/gnosis/gnosis.tasks';
import { getPendingGnosisTasks } from 'lib/gnosis/gnosis.tasks';
import log from 'lib/log';
import * as mailer from 'lib/mailer';
import { getMentionedTasks } from 'lib/mentions/getMentionedTasks';
import { getProposalTasksFromWorkspaceEvents } from 'lib/proposal/getProposalTasksFromWorkspaceEvents';
import { getVoteTasks } from 'lib/votes/getVoteTasks';

export async function sendUserNotifications (): Promise<number> {

  const notificationsToSend = await getNotifications();

  for (const notification of notificationsToSend) {
    log.info('Debug: send notification to user', { userId: notification.user.id, tasks: notification.totalTasks });
    await sendNotification(notification);
  }

  return notificationsToSend.length;
}

// note: the email only notifies the first task of each safe
const getGnosisSafeTaskId = (task: GnosisSafeTasks) => task.tasks[0].transactions[0].id;

export async function getNotifications (): Promise<PendingTasksProps[]> {

  // Get all the workspace events within the past day
  const workspaceEvents = await prisma.workspaceEvent.findMany({
    where: {
      createdAt: {
        lte: new Date(),
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24)
      },
      type: 'proposal_status_change'
    }
  });

  const usersWithSafes = await prisma.user.findMany({
    where: {
      AND: [
        { email: { not: null } },
        { email: { not: '' } }
      ]
    },
    // select only the fields that are needed
    select: {
      gnosisSafes: true,
      notificationState: true,
      id: true,
      username: true,
      email: true
    }
  });

  // filter out users that have snoozed notifications
  const activeUsersWithSafes = usersWithSafes.filter(user => {
    const snoozedUntil = user.notificationState?.snoozedUntil;
    return (!snoozedUntil || snoozedUntil > new Date());
  });

  const notifications = await Promise.all(activeUsersWithSafes.map(async user => {
    const gnosisSafeTasks = user.gnosisSafes.length > 0 ? await getPendingGnosisTasks(user.id) : [];
    const mentionedTasks = await getMentionedTasks(user.id);
    const voteTasks = await getVoteTasks(user.id);

    const sentTasks = await prisma.userNotification.findMany({
      where: {
        taskId: {
          in: [
            ...gnosisSafeTasks.map(getGnosisSafeTaskId),
            ...voteTasks.map(voteTask => voteTask.id),
            ...workspaceEvents.map(workspaceEvent => `${workspaceEvent.id}.${user.id}`)
          ]
        }
      },
      select: {
        taskId: true
      }
    });

    const sentTaskIds = new Set(sentTasks.map(sentTask => sentTask.taskId));

    const voteTasksNotSent = voteTasks.filter(voteTask => !sentTaskIds.has(voteTask.id));
    const gnosisSafeTasksNotSent = gnosisSafeTasks.filter(gnosisSafeTask => !sentTaskIds.has(getGnosisSafeTaskId(gnosisSafeTask)));
    const myGnosisTasks = gnosisSafeTasksNotSent.filter(gnosisSafeTask => Boolean(gnosisSafeTask.tasks[0].transactions[0].myAction));
    const workspaceEventsNotSent = workspaceEvents.filter(workspaceEvent => !sentTaskIds.has(`${workspaceEvent.id}.${user.id}`));
    const proposalTasks = workspaceEventsNotSent.length !== 0 ? await getProposalTasksFromWorkspaceEvents(user.id, workspaceEventsNotSent) : [];

    const totalTasks = myGnosisTasks.length + mentionedTasks.unmarked.length + voteTasksNotSent.length + proposalTasks.length;

    log.debug('Found tasks for notification', {
      notSent: gnosisSafeTasksNotSent.length + voteTasksNotSent.length + mentionedTasks.unmarked.length + proposalTasks.length,
      gnosisSafeTasks: gnosisSafeTasks.length,
      myGnosisTasks: myGnosisTasks.length
    });

    return {
      user: user as PendingTasksProps['user'],
      gnosisSafeTasks: myGnosisTasks,
      totalTasks,
      // Get only the unmarked mentioned tasks
      mentionedTasks: mentionedTasks.unmarked,
      voteTasks: voteTasksNotSent,
      proposalTasks
    };
  }));
  return notifications.filter(notification => notification.totalTasks > 0);
}

async function sendNotification (notification: PendingTasksProps) {
  const template = emails.getPendingTasksEmail(notification);
  const { html, subject } = template;
  const result = await mailer.sendEmail({
    to: {
      displayName: notification.user.username,
      email: notification.user.email
    },
    subject,
    html
  });

  // remember that we sent these tasks
  await prisma.$transaction(
    [...notification.gnosisSafeTasks.map(task => prisma.userNotification.create({
      data: {
        userId: notification.user.id,
        taskId: getGnosisSafeTaskId(task),
        channel: 'email',
        type: 'multisig'
      }
    })), ...notification.proposalTasks.map(proposalTask => prisma.userNotification.create({
      data: {
        userId: notification.user.id,
        taskId: proposalTask.id,
        channel: 'email',
        type: 'proposal'
      }
    })), ...notification.voteTasks.map(voteTask => prisma.userNotification.create({
      data: {
        userId: notification.user.id,
        taskId: voteTask.id,
        channel: 'email',
        type: 'vote'
      }
    })), ...notification.mentionedTasks.map(mentionedTask => prisma.userNotification.create({
      data: {
        userId: notification.user.id,
        taskId: mentionedTask.mentionId,
        channel: 'email',
        type: 'mention'
      }
    }))]
  );

  return result;
}

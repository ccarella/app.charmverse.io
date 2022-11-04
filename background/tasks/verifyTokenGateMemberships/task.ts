
import log from 'lib/log';
import { verifyTokenGateMemberships } from 'lib/token-gates/verifyTokenGateMemberships';

export async function task () {

  log.debug('Running Verify Token Gate memberships cron job');

  try {
    const results = await verifyTokenGateMemberships();
    log.debug('Number of members removed due to invalid token gate conditions', results.deletedUsers);
  }
  catch (error: any) {
    log.error(`Error expiring proposals: ${error.stack || error.message || error}`, { error });
  }
}

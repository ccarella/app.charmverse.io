import type { Space, User } from '@prisma/client';
import { prisma } from 'db';
import { upsertPermission } from 'lib/permissions/pages';
import type { ProposalWithUsers } from 'lib/proposal/interface';
import request from 'supertest';
import { baseUrl, loginUser } from 'testing/mockApiCall';
import { createProposalWithUsers, generateRole, generateSpaceUser, generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';
import { v4 } from 'uuid';
import type { UpdateProposalRequest } from 'lib/proposal/updateProposal';
import { createProposalTemplate } from 'lib/templates/proposals/createProposalTemplate';
import { createProposal } from 'lib/proposal/createProposal';
import type { PageWithProposal } from '../../../../../../lib/pages';

let author: User;
let reviewer: User;
let space: Space;
let authorCookie: string;
let reviewerCookie: string;

beforeAll(async () => {
  const generated1 = await generateUserAndSpaceWithApiToken(undefined, false);
  const generated2 = await generateUserAndSpaceWithApiToken(undefined, false);
  author = generated1.user;
  reviewer = generated2.user;
  space = generated1.space;

  authorCookie = (await request(baseUrl)
    .post('/api/session/login')
    .send({
      address: author.addresses[0]
    })).headers['set-cookie'][0];

  reviewerCookie = (await request(baseUrl)
    .post('/api/session/login')
    .send({
      address: reviewer.addresses[0]
    })).headers['set-cookie'][0];

  await prisma.spaceRole.create({
    data: {
      spaceId: space.id,
      userId: reviewer.id
    }
  });
});

describe('GET /api/proposals/[id] - Get proposal', () => {
  it('should return the proposal with the author and reviewers', async () => {
    const pageWithProposal = await createProposalWithUsers({
      spaceId: space.id,
      userId: author.id,
      authors: [],
      reviewers: [reviewer.id]
    });

    await upsertPermission(pageWithProposal.id, {
      permissionLevel: 'full_access',
      pageId: pageWithProposal.id,
      userId: author.id
    });

    const proposal = (await request(baseUrl)
      .get(`/api/proposals/${pageWithProposal.proposalId}`)
      .set('Cookie', authorCookie)
      .expect(200)).body as ProposalWithUsers;

    expect(proposal).toMatchObject(expect.objectContaining({
      id: expect.any(String),
      spaceId: space.id,
      createdBy: author.id,
      status: 'private_draft',
      authors: expect.arrayContaining([
        expect.objectContaining({
          proposalId: pageWithProposal.proposalId,
          userId: author.id
        })
      ]),
      reviewers: [
        expect.objectContaining({
          id: expect.any(String),
          roleId: null,
          proposalId: pageWithProposal.proposalId,
          userId: reviewer.id
        })
      ]
    }));
  });

  it('should throw error if proposal doesn\'t exist', async () => {
    await createProposalWithUsers({
      spaceId: space.id,
      userId: author.id,
      authors: [],
      reviewers: [reviewer.id]
    });

    (await request(baseUrl)
      .get(`/api/proposals/${v4()}`)
      .set('Cookie', authorCookie)
      .expect(404));
  });

  it('should throw error if user doesn\'t have read access to proposal page', async () => {
    const pageWithProposal = await createProposalWithUsers({
      spaceId: space.id,
      userId: author.id,
      authors: [],
      reviewers: [reviewer.id]
    });

    (await request(baseUrl)
      .get(`/api/proposals/${pageWithProposal.proposalId}`)
      .set('Cookie', reviewerCookie)
      .expect(404));
  });

});

describe('PUT /api/proposals/[id] - Update a proposal', () => {

  it('should update a proposal if the user is an author', async () => {

    const { user: adminUser, space: adminSpace } = await generateUserAndSpaceWithApiToken(undefined, true);
    const adminCookie = await loginUser(adminUser);

    const role = await generateRole({
      spaceId: adminSpace.id,
      createdBy: adminUser.id
    });

    const { page } = await createProposal({
      createdBy: adminUser.id,
      spaceId: adminSpace.id
    });

    const updateContent: Partial<UpdateProposalRequest> = {
      authors: [adminUser.id],
      reviewers: [{
        group: 'user',
        id: adminUser.id
      }, {
        group: 'role',
        id: role.id
      }]
    };

    const updated = (await request(baseUrl)
      .put(`/api/proposals/${page.proposalId}`)
      .set('Cookie', adminCookie)
      .send(updateContent)
      .expect(200)).body as PageWithProposal;

    // Make sure update went through
    expect(updated.proposal?.reviewers).toHaveLength(2);
    expect(updated.proposal?.reviewers.some(r => r.roleId === role.id)).toBe(true);
    expect(updated.proposal?.reviewers.some(r => r.userId === adminUser.id)).toBe(true);
  });

  it('should update a proposal if the user is an admin', async () => {

    const { user: adminUser, space: adminSpace } = await generateUserAndSpaceWithApiToken(undefined, true);
    const adminCookie = await loginUser(adminUser);

    const proposalAuthor = await generateSpaceUser({ isAdmin: false, spaceId: adminSpace.id });

    const { page } = await createProposal({
      createdBy: proposalAuthor.id,
      spaceId: adminSpace.id
    });

    const updateContent: Partial<UpdateProposalRequest> = {
      authors: [adminUser.id],
      reviewers: [{
        group: 'user',
        id: adminUser.id
      }]
    };

    await request(baseUrl)
      .put(`/api/proposals/${page.proposalId}`)
      .set('Cookie', adminCookie)
      .send(updateContent)
      .expect(200);

  });

  it('should update a proposal template if the user is a space admin', async () => {

    const { user: adminUser, space: adminSpace } = await generateUserAndSpaceWithApiToken(undefined, true);
    const adminCookie = await loginUser(adminUser);

    const role = await generateRole({ createdBy: adminUser.id, spaceId: adminSpace.id });

    const pageWithProposal = await createProposalTemplate({
      spaceId: adminSpace.id,
      userId: adminUser.id
    });

    const updateContent: Partial<UpdateProposalRequest> = {
      authors: [adminUser.id],
      reviewers: [{
        group: 'user',
        id: adminUser.id
      }, {
        group: 'role',
        id: role.id
      }]
    };

    const updated = (await request(baseUrl)
      .put(`/api/proposals/${pageWithProposal.proposalId}`)
      .set('Cookie', adminCookie)
      .send(updateContent)
      .expect(200)).body as PageWithProposal;

    // Make sure update went through
    expect(updated.proposal?.reviewers).toHaveLength(2);
    expect(updated.proposal?.reviewers.some(r => r.roleId === role.id)).toBe(true);
    expect(updated.proposal?.reviewers.some(r => r.userId === adminUser.id)).toBe(true);
  });

  it('should fail to update a proposal template if the user is not a space admin', async () => {
    const { user: adminUser, space: adminSpace } = await generateUserAndSpaceWithApiToken(undefined, false);
    const nonAdminUser = await generateSpaceUser({ isAdmin: false, spaceId: adminSpace.id });

    const nonAdminCookie = await loginUser(nonAdminUser);

    const pageWithProposal = await createProposalTemplate({
      spaceId: adminSpace.id,
      userId: adminUser.id,
      reviewers: [{
        group: 'user',
        id: adminUser.id
      }]
    });

    const updateContent: Partial<UpdateProposalRequest> = {
      authors: [adminUser.id],
      reviewers: [{
        group: 'user',
        id: adminUser.id
      }]
    };

    await request(baseUrl)
      .put(`/api/proposals/${pageWithProposal.proposalId}`)
      .set('Cookie', nonAdminCookie)
      .send(updateContent)
      .expect(401);
  });
});

import { useEffect, useMemo, useState } from 'react';
import { ScrollableModal } from 'components/common/Modal';
import { GetGuildsResponse, guild, user } from '@guildxyz/sdk';
import { Autocomplete, Box, MenuItem, TextField, Typography } from '@mui/material';
import charmClient from 'charmClient';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { mutate } from 'swr';
import { useUser } from 'hooks/useUser';
import GuildXYZIcon from 'public/images/guild_logo.svg';
import { useSnackbar } from 'hooks/useSnackbar';
import { PimpedButton, StyledSpinner } from '../../../common/Button';
import GuildsAutocomplete from './GuildsAutocomplete';

export default function ImportGuildRolesMenuItem ({ onClose }: {onClose: () => void}) {
  const [showImportedRolesModal, setShowImportedRolesModal] = useState(false);
  const [guilds, setGuilds] = useState<GetGuildsResponse>([]);
  const [fetchingGuilds, setFetchingGuilds] = useState(false);
  const [importingRoles, setImportingRoles] = useState(false);
  const [selectedGuildIds, setSelectedGuildIds] = useState<number[]>([]);
  const [space] = useCurrentSpace();
  const { user: currentUser } = useUser();
  const addresses = currentUser?.addresses ?? [];
  const { showMessage } = useSnackbar();

  useEffect(() => {
    async function main () {
      if (showImportedRolesModal) {
        setFetchingGuilds(true);
        const guildMembershipsResponses = await Promise.all(addresses.map(address => user.getMemberships(address)));
        const userGuildIds: number[] = [];

        guildMembershipsResponses.forEach(guildMembershipsResponse => {
          if (guildMembershipsResponse) {
            userGuildIds.push(...guildMembershipsResponse.map(guildMembership => guildMembership.guildId));
          }
        });
        const allGuilds = await guild.getAll();
        setSelectedGuildIds(userGuildIds);
        setGuilds(allGuilds);
        setFetchingGuilds(false);
      }
    }
    main();
  }, [showImportedRolesModal]);

  function resetState () {
    setShowImportedRolesModal(false);
    setImportingRoles(false);
    setFetchingGuilds(false);
    setSelectedGuildIds([]);
    setGuilds([]);
    onClose();
  }

  async function importRoles () {
    if (space) {
      setImportingRoles(true);
      const { importedRolesCount } = await charmClient.importRolesFromGuild({
        guildIds: selectedGuildIds,
        spaceId: space.id
      });
      resetState();
      showMessage(`Successfully imported and assigned ${importedRolesCount} roles from guild.xyz`);
      mutate(`roles/${space.id}`);
    }
  }

  return (
    <>
      <MenuItem
        disableRipple
        onClick={() => {
          setShowImportedRolesModal(true);
        }}
      >
        <GuildXYZIcon style={{
          marginRight: 8,
          transform: 'scale(0.75)'
        }}
        />
        Guild.xyz
      </MenuItem>
      <ScrollableModal size='large' title='Import Guild roles' onClose={resetState} open={showImportedRolesModal}>
        <Box sx={{
          px: 4,
          minHeight: 50
        }}
        >
          {
            fetchingGuilds ? <StyledSpinner /> : guilds.length === 0 ? <Typography variant='subtitle1' color='secondary'>You are not part of any guild(s)</Typography> : (
              <Box sx={{
                paddingRight: 1
              }}
              >
                <GuildsAutocomplete
                  disabled={importingRoles || fetchingGuilds}
                  onChange={(guildIds) => {
                    setSelectedGuildIds(guildIds);
                  }}
                  selectedGuildIds={selectedGuildIds}
                  guilds={guilds}
                />
                <PimpedButton
                  loading={importingRoles}
                  sx={{
                    mt: 2
                  }}
                  disabled={importingRoles || selectedGuildIds.length === 0}
                  onClick={importRoles}
                >Import Roles
                </PimpedButton>
              </Box>
            )
          }
        </Box>
      </ScrollableModal>
    </>
  );
}

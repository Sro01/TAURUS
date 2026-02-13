import { teamService } from '../services';
import { Team } from '../types/team';
import { useAsync } from './useAsync';

export function useTeam() {
    const {
        data: myTeam,
        loading,
        error,
        execute: fetchMyTeam
    } = useAsync<Team, []>(teamService.getMe);

    const { execute: updateName } = useAsync(teamService.updateName);
    const { execute: updatePassword } = useAsync(teamService.updatePassword);
    const { execute: deleteMe } = useAsync(teamService.deleteMe);

    const updateTeamName = async (name: string) => {
        const updated = await updateName(name);
        fetchMyTeam(); // 혹은 로컬 상태 업데이트
        return updated;
    };

    const updateTeamPassword = async (currentPassword: string, password: string) => {
        await updatePassword(currentPassword, password);
    };

    const deleteTeam = async () => {
        await deleteMe();
    };

    return {
        myTeam,
        loading,
        error,
        fetchMyTeam,
        updateTeamName,
        updateTeamPassword,
        deleteTeam,
    };
}

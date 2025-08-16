import { User } from "@/lib/interface";

interface SelectedUsersProps {
  users: User[];
  onRemoveUser: (user: User) => void;
}

export default function SelectedUsers({
  users,
  onRemoveUser,
}: SelectedUsersProps) {
  return (
    <div className="mb-2 p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-full flex items-center justify-center">
          <span className="text-xs">👥</span>
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">
          Users Involved ({users.length})
        </span>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            No users mentioned yet. Type @ in the chat to mention someone!
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {users.map((user) => (
            <div
              key={user.walletAddress}
              className="flex items-center gap-2 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg px-3 py-2 group hover:from-[var(--color-primary)]/20 hover:to-[var(--color-primary)]/10 transition-all duration-200"
            >
              {/* User Avatar */}
              <div className="w-6 h-6 bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/20 rounded-full flex items-center justify-center text-xs font-semibold text-[var(--color-primary)]">
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* Username */}
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                @{user.username}
              </span>

              {/* Remove Button */}
              <button
                onClick={() => onRemoveUser(user)}
                className="w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors duration-200 group-hover:scale-110"
                title={`Remove @${user.username}`}
              >
                <span className="text-red-400 text-xs font-bold">×</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

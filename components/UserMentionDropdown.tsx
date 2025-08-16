import { useState, useEffect, useRef } from "react";
import { User } from "@/lib/interface";

interface UserMentionDropdownProps {
  isOpen: boolean;
  searchTerm: string;
  onSelectUser: (user: User) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function UserMentionDropdown({
  isOpen,
  searchTerm,
  onSelectUser,
  onClose,
  position,
}: UserMentionDropdownProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl shadow-black/20 backdrop-blur-sm min-w-[280px] max-w-[320px]"
      style={{
        left: position.x,
        bottom: "100%", // Position above the input
        marginBottom: "8px", // Add some spacing
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
            <span className="text-sm">👥</span>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              Mention User
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
              found
            </p>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce delay-200"></div>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Loading users...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {searchTerm
                ? `No users found for "${searchTerm}"`
                : "No users available"}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredUsers.map((user, index) => (
              <button
                key={user.walletAddress}
                onClick={() => {
                  onSelectUser(user);
                }}
                className="w-full px-4 py-3 cursor-pointer text-left hover:bg-[var(--color-primary)]/10 transition-colors duration-150 flex items-center gap-3 group"
              >
                {/* User Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-full flex items-center justify-center text-lg font-semibold text-[var(--color-primary)] group-hover:scale-110 transition-transform duration-150">
                  {user.username.charAt(0).toUpperCase()}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-150">
                    @{user.username}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] font-mono truncate">
                    {user.walletAddress}
                  </div>
                </div>

                {/* Selection Indicator */}
                <div className="w-5 h-5 border-2 border-[var(--color-border)] rounded-full group-hover:border-[var(--color-primary)] transition-colors duration-150 flex items-center justify-center">
                  <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] bg-gradient-to-r from-transparent to-[var(--color-primary)]/5">
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          Type @ to mention users • {filteredUsers.length} total users
        </p>
      </div>
    </div>
  );
}

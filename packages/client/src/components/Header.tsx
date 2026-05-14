import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Button from "./ui/Button";

export default function Header() {
  const navigate = useNavigate();
  const { user, signout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOrganizer = user?.role === "organizer";

  // close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSignout() {
    signout();
    setOpen(false);
    navigate("/");
  }

  return (
    <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-content mx-auto w-full flex items-center justify-between px-7 py-4 ">
        <Link to="/" className="font-['Righteous'] text-2xl text-gray-900">
          ani<span className="text-orange-500">fest</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden md:inline-block text-sm mr-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            events
          </Link>
          {isOrganizer && (
            <Button onClick={() => navigate("/create")} variant="dark">
              + Create event
            </Button>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              {/* avatar */}
              <button
                onClick={() => setOpen((p) => !p)}
                className="cursor-pointer size-9 rounded-full bg-orange-500 text-white font-semibold text-sm flex items-center justify-center hover:bg-orange-600 transition-colors"
              >
                {user.name?.charAt(0).toUpperCase()}
              </button>

              {/* dropdown */}
              {open && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 min-w-48">
                  {/* user info */}
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-semibold text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                    <span className="inline-block mt-1 text-xs font-semibold text-orange-500 capitalize">
                      {user.role}
                    </span>
                  </div>

                  {/* nav items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/");
                        setOpen(false);
                      }}
                      className="md:hidden inline-block cursor-pointer w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Explore events
                    </button>
                    <button
                      onClick={() => {
                        navigate("/dashboard");
                        setOpen(false);
                      }}
                      className="cursor-pointer w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {isOrganizer ? "My events" : "My registrations"}
                    </button>
                  </div>

                  {/* signout */}
                  <div className="border-t border-gray-50 py-1">
                    <button
                      onClick={handleSignout}
                      className="cursor-pointer w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => navigate("/login")} variant="dark">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

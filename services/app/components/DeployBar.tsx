'use client';

import { useEffect, useState } from 'react';
import { Terminal, X, GitCommit, Server, Folder, User, Calendar } from 'lucide-react';

export function DeployBar() {
  const [deployData, setDeployData] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeployInfo() {
      try {
        const res = await fetch('/api/deploy-info');
        if (res.ok) {
          const data = await res.json();
          setDeployData(data);
        }
      } catch (error) {
        console.error('Failed to fetch deploy info:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDeployInfo();
  }, []);

  // Lấy các biến cụ thể, fallback về "unknow" nếu không tồn tại hoặc rỗng
  const commitId = deployData['_DOTENVRTDB_RUNNER_COMMIT_SHORT_ID'] || 'unknow';
  const commitAt = deployData['_DOTENVRTDB_RUNNER_COMMIT_AT'] || 'unknow';
  const hostType = deployData['_DOTENVRTDB_RUNNER_HOST_TYPE'] || 'unknow';
  const repo = deployData['_DOTENVRTDB_RUNNER_REPO'] || 'unknow';
  const org = deployData['_DOTENVRTDB_RUNNER_ORG'] || 'unknow';

  return (
    <>
      {/* Bottom Fixed Bar */}
      <div 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-0 left-0 right-0 z-40 flex h-9 cursor-pointer items-center justify-between border-t border-white/10 bg-surface-dark/80 px-4 text-xs font-mono text-white/60 backdrop-blur-md transition-colors hover:bg-surface-dark/95 hover:text-white"
        title="Click to view all deployment environment variables"
      >
        <div className="flex items-center gap-4 overflow-hidden truncate">
          <span className="flex items-center gap-1.5 text-primary shrink-0">
            <Terminal className="h-3.5 w-3.5 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Deploy info:</span>
          </span>
          
          <span className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 text-white/40" />
            <span className="text-white/40">Org:</span>
            <span className="text-white/80 font-medium">{org}</span>
          </span>

          <span className="flex items-center gap-1 truncate">
            <Folder className="h-3 w-3 text-white/40" />
            <span className="text-white/40">Repo:</span>
            <span className="text-white/80 font-medium">{repo}</span>
          </span>

          <span className="flex items-center gap-1 shrink-0">
            <GitCommit className="h-3 w-3 text-white/40" />
            <span className="text-white/40">Commit:</span>
            <span className="text-white/80 font-medium">{commitId}</span>
          </span>

          <span className="hidden sm:flex items-center gap-1 shrink-0">
            <Calendar className="h-3 w-3 text-white/40" />
            <span className="text-white/40">Date:</span>
            <span className="text-white/80 font-medium">{commitAt}</span>
          </span>

          <span className="hidden md:flex items-center gap-1 shrink-0">
            <Server className="h-3 w-3 text-white/40" />
            <span className="text-white/40">Host:</span>
            <span className="text-white/80 font-medium">{hostType}</span>
          </span>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-primary shrink-0 font-semibold hover:underline pl-2">
          Details ➔
        </div>
      </div>

      {/* Modal View All Details */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-surface-dark p-6 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-white">
                <Terminal className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Deployment Environment Variables</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <p className="mb-4 text-xs text-white/50 leading-relaxed">
                Showing all loaded environment variables containing the prefix <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-primary">_DOTENVRTDB_RUNNER_</code>.
              </p>
              
              {loading ? (
                <div className="py-8 text-center text-xs text-white/40">Loading environment variables...</div>
              ) : Object.keys(deployData).length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-lg">
                  No environment variables with prefix <code className="font-mono text-white/60">_DOTENVRTDB_RUNNER_</code> found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                  <table className="w-full text-left text-xs font-mono text-white/80">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-white/40">
                        <th className="px-4 py-3 font-semibold">Variable Name</th>
                        <th className="px-4 py-3 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {Object.entries(deployData)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, val]) => (
                          <tr key={key} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium text-primary select-all break-all pr-2">{key}</td>
                            <td className="px-4 py-3 text-white/90 select-all break-all whitespace-pre-wrap">{val || <span className="text-white/20 italic">empty</span>}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end border-t border-white/10 pt-4">
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/15 active:bg-white/20 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

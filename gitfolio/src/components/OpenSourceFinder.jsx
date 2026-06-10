import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { GitPullRequest, Star, ExternalLink } from 'lucide-react';

const FALLBACK_OPPORTUNITIES = [
  { repo: 'microsoft/vscode', title: 'Good first issues in VSCode', stars: 162000, lang: 'TypeScript', url: 'https://github.com/microsoft/vscode/issues?q=label%3A%22good+first+issue%22' },
  { repo: 'facebook/react', title: 'Good first issues in React', stars: 220000, lang: 'JavaScript', url: 'https://github.com/facebook/react/issues?q=label%3A%22good+first+issue%22' },
  { repo: 'vercel/next.js', title: 'Good first issues in Next.js', stars: 118000, lang: 'JavaScript', url: 'https://github.com/vercel/next.js/issues?q=label%3A%22good+first+issue%22' },
  { repo: 'django/django', title: 'Good first issues in Django', stars: 77000, lang: 'Python', url: 'https://github.com/django/django/issues?q=label%3A%22easy+pickings%22' },
  { repo: 'vuejs/vue', title: 'Good first issues in Vue', stars: 207000, lang: 'JavaScript', url: 'https://github.com/vuejs/vue/issues?q=label%3A%22good+first+issue%22' },
  { repo: 'golang/go', title: 'Good first issues in Go', stars: 119000, lang: 'Go', url: 'https://github.com/golang/go/issues?q=label%3A%22GoodFirstIssue%22' },
];

const OpenSourceFinder = ({ issues = [] }) => {
  const displayIssues = issues.length > 0 ? issues : FALLBACK_OPPORTUNITIES;
  const isFallback = issues.length === 0;

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <GitPullRequest size={18} className="text-[#58a6ff]" />
        <h3 className="text-lg font-bold text-[#e6edf3]">Open Source Issues</h3>
      </div>

      {isFallback && (
        <p className="text-xs text-[#8b949e] italic">
          Browse curated beginner-friendly repos while we fetch live issues.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayIssues.slice(0, 6).map((issue, i) => {
          const repoName = issue.repo || issue.repoName || 'Repository';
          const lang = issue.lang || issue.language || 'N/A';
          const issueUrl = issue.url || '#';
          const stars = issue.stars || 0;
          const title = issue.title || `Good first issues in ${repoName.split('/').pop()}`;

          return (
            <div
              key={i}
              className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3 hover:border-[#58a6ff] transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-[#e6edf3] line-clamp-2 flex-1">
                  {repoName}
                </h4>
                <Badge variant="info" className="text-[10px] shrink-0">
                  {lang}
                </Badge>
              </div>

              <p className="text-xs text-[#8b949e] line-clamp-3 flex-1">
                {title}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
                <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-[#eab308]" /> {stars.toLocaleString()}
                  </span>
                </div>
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-[#58a6ff] hover:underline shrink-0"
                >
                  View Issue <ExternalLink size={12} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default OpenSourceFinder;

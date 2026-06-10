import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Copy, Check, FileText, Eye, Code, X, Sparkles } from 'lucide-react';

const ReadmeGenerator = ({ profile = {} }) => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [copied, setCopied] = useState(false);

  const {
    name = 'Developer',
    login = 'username',
    bio = '',
    company = '',
    location = '',
    blog = '',
    twitter_username = '',
    public_repos = 0,
    followers = 0,
    following = 0,
  } = profile;

  const readmeMarkdown = `
# Hi there, I'm ${name || login}! 👋

<!-- Typing SVG -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.herokuapp.com/?lines=Full-Stack+Developer;Open+Source+Contributor;Always+Learning&center=true&width=500&height=50" />
</a>

## 📊 GitHub Stats

<div align="center">
  <img src="https://github-readme-stats.vercel.app/api?username=${login}&show_icons=true&theme=github_dark&hide_border=true" alt="GitHub Stats" />
  <img src="https://github-readme-streak-stats.herokuapp.com/?user=${login}&theme=github-dark-blue&hide_border=true" alt="GitHub Streak" />
</div>

## 🛠️ Skills

<p>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
</p>

## 📈 Top Projects

| Project | Description | Stars | Forks |
|---------|-------------|-------|-------|
| 
## 🔗 Connect with Me

${twitter_username ? `- [Twitter](https://twitter.com/${twitter_username})` : ''}
${blog ? `- [Website](${blog})` : ''}
- [GitHub](https://github.com/${login})

---

<div align="center">
  <img src="https://komarev.com/ghpvc/?username=${login}&label=Profile%20views&color=0e75b6&style=flat" alt="Profile views" /> 
</div>
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(readmeMarkdown.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-[#58a6ff]" />
        <h3 className="text-lg font-bold text-[#e6edf3]">README Generator</h3>
      </div>

      <p className="text-sm text-[#8b949e]">
        Generate a stunning GitHub profile README to showcase your skills and projects.
      </p>

      <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
        <Sparkles size={16} className="mr-2" /> Generate README
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max koja mx-auto max-h-[90vh] flex flex-col" style={{ maxWidth: '700px' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
              <h3 className="text-lg font-bold text-[#e6edf3]">Your GitHub README</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md hover:bg-[#30363d] transition-colors"
              >
                <X size={18} className="text-[#8b949e]" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#30363d]">
              <button
                onClick={() => setActiveTab('raw')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'raw' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                <Code size={14} /> Raw Markdown
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'preview' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                <Eye size={14} /> Preview
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {activeTab === 'raw' ? (
                <div className="relative">
                  <pre className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-xs text-[#e6edf3] font-mono overflow-auto whitespace-pre-wrap break-words" style={{ maxHeight: '400px' }}>
                    {readmeMarkdown.trim()}
                  </pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    className="absolute top-2 right-2"
                  >
                    {copied ? (
                      <><Check size={14} className="mr-1 text-[#3fb950]" /> <span className="text-[#3fb950]">Copied!</span></>
                    ) : (
                      <><Copy size={14} className="mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6 space-y-4 overflow-auto" style={{ maxHeight: '400px' }}>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-[#e6edf3]">Hi there, I'm {name || login}! 👋</h1>
                    <p className="text-sm text-[#8b949e]">{bio || 'Passionate developer building cool things.'}</p>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-[#e6edf3]">📊 GitHub Stats</h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="info">Repos: {public_repos}</Badge>
                      <Badge variant="info">Followers: {followers}</Badge>
                      <Badge variant="info">Following: {following}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-[#e6edf3]">🛠️ Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'].map(skill => (
                        <span key={skill} className="px-2 py-1 text-xs rounded-full bg-[#21262d] text-[#58a6ff] border border-[#30363d]">{skill}</span>
                      ))}
                    </div>
                  </div>
                  {company && <p className="text-sm text-[#8b949e]">Working at: {company}</p>}
                  {location && <p className="text-sm text-[#8b949e]">Location: {location}</p>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#30363d] flex justify-end">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ReadmeGenerator;

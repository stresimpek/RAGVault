import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Head from 'next/head';
import dynamic from 'next/dynamic'; 
import { 
  Plus, FileText, Trash2, Send, Bot, Minimize2, Database 
} from 'lucide-react';

const PDFViewerPanel = dynamic(
  () => import('../components/PDFViewerPanel'), 
  { ssr: false }
);

const API_URL = 'http://localhost:8000';

export default function RAGDashboard() {
  const [files, setFiles] = useState([]);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [activeSource, setActiveSource] = useState(null); 
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const [viewerTrigger, setViewerTrigger] = useState(0); 

  const chatContainerRef = useRef(null);

  useEffect(() => { fetchFiles(); }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, loading]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files`);
      setFiles(res.data.files || []); 
    } catch (err) { console.error("Error loading files", err); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/upload`, formData);
      await fetchFiles(); 
    } catch (error) { alert('Upload failed'); } 
    finally { setUploading(false); e.target.value = null; }
  };

  const handleDelete = async (filename, e) => {
    e.stopPropagation();
    if(!confirm(`Delete ${filename}?`)) return;
    try {
      await axios.delete(`${API_URL}/files/${encodeURIComponent(filename)}`);
      await fetchFiles(); 
    } catch (error) { alert("Delete failed"); }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    const newHistory = [...history, { type: 'user', content: query }];
    setHistory(newHistory);
    setLoading(true);
    setQuery('');

    try {
      const res = await axios.post(`${API_URL}/chat`, { question: query });
      
      const answerMsg = { 
        type: 'ai', 
        content: res.data.answer, 
        sources: res.data.sources 
      };

      setHistory([...newHistory, answerMsg]);

      if (res.data.sources && res.data.sources.length > 0) {
        handleOpenSource(res.data.sources[0]);
      }
    } catch (error) {
      setHistory([...newHistory, { type: 'ai', content: 'Sorry, system error.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSource = (src) => {
    setActiveSource(src);
    setViewerTrigger(Date.now()); 
    setIsViewerOpen(true);
  };

  return (
    <>
      <Head><title>Knowledge Base</title></Head>
      <div className="flex h-screen w-full bg-[#050505] text-white font-sans overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-[280px] bg-[#0b0c15] flex flex-col border-r border-white/5 shrink-0 z-20">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Database size={20} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">RAGVault</h1>
          </div>

          <div className="px-5 mb-8">
            <label className={`flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-900/20 cursor-pointer transition-all active:scale-95 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
              <span>{uploading ? 'Indexing...' : 'Add PDF'}</span>
              <input 
                id="file-upload" name="file-upload" 
                type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={uploading}
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
            <div className="space-y-1">
              {files.map((file, idx) => (
                <div key={idx} className="group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-default hover:bg-white/5 transition-all text-gray-400 hover:text-gray-200">
                  <FileText size={18} className="text-indigo-400" />
                  <span className="text-sm font-medium truncate flex-1" title={file}>{file}</span>
                  <button onClick={(e) => handleDelete(file, e)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CHAT */}
        <main className="flex-1 flex flex-col relative min-w-0 bg-[#050505]">
            <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 z-10 bg-[#050505]/80 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${files.length > 0 ? 'bg-emerald-500/10' : 'bg-gray-800'}`}>
                        <Bot size={18} className={files.length > 0 ? "text-emerald-400" : "text-gray-500"} />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-medium text-white truncate">{files.length} documents indexed</h2>
                    </div>
                </div>
                {activeSource && !isViewerOpen && (
                    <button onClick={() => handleOpenSource(activeSource)} className="text-xs flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors">
                        <Minimize2 size={14} /> Open Source
                    </button>
                )}
            </header>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth pb-32 custom-scrollbar">
                {history.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.type === 'ai' && <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 mt-1 shadow-lg"><Bot size={18} className="text-white" /></div>}
                        <div className={`max-w-[80%] lg:max-w-[70%] space-y-2 ${msg.type === 'user' ? 'items-end flex flex-col' : ''}`}>
                            <div className={`p-5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${msg.type === 'user' ? 'bg-[#4f46e5] text-white rounded-br-none' : 'bg-[#18181b] border border-white/5 text-gray-200 rounded-tl-none'}`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                           Verifiable Source
                                        </div>
                                        
                                        <div className="bg-[#0c0e12] p-3 rounded-lg border border-white/5 group hover:border-indigo-500/30 transition-colors">
                                            <p className="text-xs text-gray-400 italic mb-3 font-serif leading-relaxed opacity-80">
                                                "{msg.sources[0].text}"
                                            </p>
                                            
                                            <button 
                                                onClick={() => handleOpenSource(msg.sources[0])} 
                                                className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all font-medium"
                                            >
                                                <FileText size={14} />
                                                Check PDF (Page {msg.sources[0].page_number})
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && <div className="flex gap-4"><div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 animate-pulse"><Bot size={18} className="text-white" /></div><div className="p-5 rounded-2xl bg-[#18181b] border border-white/5 rounded-tl-none flex items-center gap-2"><span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span><span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span></div></div>}
            </div>

            <div className="absolute bottom-6 left-0 right-0 px-6 z-20 flex justify-center">
                <div className="w-full max-w-3xl bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl p-2 flex items-end gap-2 transition-all">
                    
                    <textarea 
                        id="chat-input" name="chat-input"
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); }}} 
                        className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-white placeholder-gray-500 py-3 max-h-32 min-h-[48px] resize-none" 
                        placeholder="Ask something..." 
                        rows={1}
                    />
                    
                    <button onClick={handleSearch} disabled={!query.trim() || loading} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg disabled:opacity-50 transition-all">
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </main>

        <PDFViewerPanel 
            isOpen={isViewerOpen} 
            source={activeSource} 
            trigger={viewerTrigger}
            onClose={() => setIsViewerOpen(false)} 
            apiUrl={API_URL}
        />
      </div>
    </>
  );
}
import { useState, useEffect, memo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewerPanel = memo(({ source, isOpen, onClose, apiUrl, trigger }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  
  const containerRef = useRef(null);

  useEffect(() => {
    if (source) {
      setPageNumber(source.page_number || 1);
    }
  }, [source, trigger]);

  if (!isOpen || !source) return null;

  const fileUrl = `${apiUrl}/static/${encodeURIComponent(source.filename)}`;

  return (
    <aside className="w-[50%] bg-[#18181b] border-l border-white/5 flex flex-col shadow-2xl z-30 relative h-full animate-in slide-in-from-right duration-300">
      {/* HEADER */}
      <div className="h-14 flex items-center justify-between px-4 bg-[#09090b] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-indigo-500/10 p-1.5 rounded-md">
             <span className="text-[10px] font-bold text-indigo-400 uppercase">PDF</span>
          </div>
          <span className="text-sm text-gray-200 truncate font-medium max-w-[200px]" title={source.filename}>
            {source.filename}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg mr-2 border border-white/5">
            <button onClick={() => setScale(s => Math.max(0.6, s - 0.2))} className="p-1.5 hover:bg-white/10 text-gray-400"><ZoomOut size={16}/></button>
            <span className="text-[10px] text-gray-400 w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="p-1.5 hover:bg-white/10 text-gray-400"><ZoomIn size={16}/></button>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* PDF BODY */}
      <div ref={containerRef} className="flex-1 overflow-auto p-6 flex justify-center bg-[#27272a]/50">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <span className="text-xs font-medium">Memuat Dokumen...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400 px-8 text-center">
              <span className="font-bold">Gagal memuat PDF</span>
              <span className="text-xs text-white/50">Cek koneksi Backend / CORS.</span>
            </div>
          }
          className="shadow-2xl"
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            renderTextLayer={true} 
            renderAnnotationLayer={false}
            className="shadow-xl border border-white/5"
            width={containerRef.current ? containerRef.current.offsetWidth - 60 : 600}
          />
        </Document>
      </div>

      {/* FOOTER NAVIGASI */}
      <div className="h-14 bg-[#09090b] border-t border-white/5 flex items-center justify-between px-6 shrink-0">
        <button 
          onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
          disabled={pageNumber <= 1}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-medium transition-all"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        
        <span className="text-xs text-gray-400 font-mono bg-white/5 px-3 py-1 rounded-full border border-white/5">
          Page {pageNumber} / {numPages || '-'}
        </span>
        
        <button 
          onClick={() => setPageNumber(prev => Math.min(numPages || 1, prev + 1))}
          disabled={pageNumber >= numPages}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-medium transition-all"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  );
});

export default PDFViewerPanel;
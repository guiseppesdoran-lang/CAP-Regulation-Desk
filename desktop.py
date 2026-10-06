"""Independent desktop launcher; no Codex runtime or session required."""
import pathlib, os, threading, tkinter as tk, webbrowser
from tkinter import ttk, messagebox

class Desk:
    def __init__(self,window):
        self.window=window;self.httpd=None;self.server=None;self.url=None
        window.title('CAP Regulation Desk');window.geometry('580x350');window.minsize(500,320)
        frame=ttk.Frame(window,padding=24);frame.pack(fill='both',expand=True)
        ttk.Label(frame,text='CAP Regulation Desk',font=('Segoe UI',22,'bold')).pack(anchor='w')
        ttk.Label(frame,text='Standalone Civil Air Patrol question assistant',font=('Segoe UI',11)).pack(anchor='w',pady=(5,20))
        self.status=tk.StringVar(value='Ready to start. The question interface opens in your browser.')
        ttk.Label(frame,textvariable=self.status,wraplength=500).pack(anchor='w',pady=(0,16))
        self.start_button=ttk.Button(frame,text='Open question bot',command=self.start);self.start_button.pack(fill='x',pady=5)
        ttk.Button(frame,text='Configure API key',command=self.settings).pack(fill='x',pady=5)
        ttk.Label(frame,text='Keep this window open while using the bot. Internet and API credits are required for AI answers; source research works offline.',wraplength=500).pack(anchor='w',pady=15)
        window.protocol('WM_DELETE_WINDOW',self.close)
    def start(self):
        if self.url:webbrowser.open(self.url);return
        self.start_button.configure(state='disabled');self.status.set('Loading publications…')
        threading.Thread(target=self.load,daemon=True).start()
    def load(self):
        try:
            import server
            self.server=server
            self.httpd=server.create_server()
            threading.Thread(target=self.httpd.serve_forever,daemon=True).start()
            self.url='http://localhost:'+str(self.httpd.server_port)
            self.window.after(0,self.ready)
        except Exception as error:self.window.after(0,lambda e=str(error):self.failed(e))
    def ready(self):
        self.start_button.configure(state='normal');self.status.set('Running at '+self.url+'. This program runs independently of ChatGPT and Codex.')
        webbrowser.open(self.url)
        try:self.server.key()
        except RuntimeError:self.settings()
    def failed(self,error):
        self.start_button.configure(state='normal');self.status.set('Startup failed.');messagebox.showerror('Cannot start',error,parent=self.window)
    def settings(self):
        popup=tk.Toplevel(self.window);popup.title('API configuration');popup.geometry('530x230');popup.transient(self.window)
        frame=ttk.Frame(popup,padding=20);frame.pack(fill='both',expand=True)
        ttk.Label(frame,text='OpenAI API key (saved locally, never uploaded to GitHub)').pack(anchor='w')
        entry=ttk.Entry(frame,show='•',width=60);entry.pack(fill='x',pady=12)
        ttk.Label(frame,text='Saving stores the key in your Windows user profile. Leave blank to keep the existing key.',wraplength=460).pack(anchor='w')
        def save():
            value=entry.get().strip()
            if value:
                if not value.startswith('sk-') or any(c.isspace() for c in value):messagebox.showerror('Invalid key','Enter a valid OpenAI API key.',parent=popup);return
                target=pathlib.Path(os.environ.get('CAP_REGULATION_CONFIG_DIR',str(pathlib.Path(os.environ.get('APPDATA',str(pathlib.Path.home()/'.config')))/'CAPRegulationDesk')))
                target.mkdir(parents=True,exist_ok=True)
                (target/'.env.local').write_text('OPENAI_API_KEY='+value+'\n',encoding='utf-8')
                entry.delete(0,'end')
            popup.destroy()
        ttk.Button(frame,text='Save configuration',command=save).pack(fill='x',pady=14)
    def close(self):
        if self.httpd:self.httpd.shutdown();self.httpd.server_close()
        self.window.destroy()

if __name__=='__main__':
    root=tk.Tk();Desk(root);root.mainloop()

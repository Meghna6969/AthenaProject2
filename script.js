document.addEventListener('DOMContentLoaded', function() {
    const editors = {
        1: CodeMirror.fromTextArea(document.getElementById('codeEditor1'), {
            lineNumbers: true,
            theme: 'dracula',
            mode: 'text/plain',
            extraKeys: {"Ctrl-Space": "autocomplete"},
            hintOptions: { completeSingle: false }
        }),
        2: CodeMirror.fromTextArea(document.getElementById('codeEditor2'), {
            lineNumbers: true,
            theme: 'dracula',
            mode: 'text/plain',
            extraKeys: {"Ctrl-Space": "autocomplete"},
            hintOptions: { completeSingle: false }
        })
    };

    Object.values(editors).forEach(editor => {
        editor.on('inputRead', function(cm, change) {
            if (change.origin === "+input" && change.text[0].trim().length > 0) {
                cm.showHint({ completeSingle: false });
            }
        });
    });

    const newFileBtn = document.getElementById('newFileBtn');
    const fileList = document.querySelector('.file-list');
    const emptyMessage = document.querySelector('.empty-message');
    const contextMenu = document.getElementById('contextMenu');
    const renameFileBtn = document.getElementById('renameFileBtn');
    const deleteFileBtn = document.getElementById('deleteFileBtn');
    const splitViewBtn = document.getElementById('splitViewBtn');
    const editorSection = document.querySelector('.editor-section');
    const editorPlaceholder = document.getElementById('editor-placeholder');
    const runBtn = document.getElementById('runBtn');
    const terminalContainer = document.getElementById('terminal-container');
    const terminalResizer = document.getElementById('terminal-resizer');
    const previewResizer = document.getElementById('preview-resizer');
    
    const tabsContainers = {
        1: document.getElementById('tabsContainer1'),
        2: document.getElementById('tabsContainer2')
    };
    const editorPanes = {
        1: document.getElementById('editorPane1'),
        2: document.getElementById('editorPane2')
    };
    const resizer = document.getElementById('resizer');

    let files = {};
    let contextFile = null;
    let openFiles = { 1: [], 2: [] };
    let currentFiles = { 1: null, 2: null };
    let activePane = 1;
    let pyodide = null;
    let term = null;

    const supportedExtensions = ['txt', 'html', 'css', 'js', 'py'];

    async function initPyodide(){
        term = new Terminal({convertEol: true, theme: {background: '#1e1e1e'}});
        term.open(terminalContainer);
        term.writeln('Initializing Pyodide...');
        pyodide = await loadPyodide();
        term.writeln('Pyodide and Python environment is ready!');
    }


    function isValidFileExtension(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        return supportedExtensions.includes(extension);
    }

    function getModeForFilename(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        switch (extension) {
            case 'html':
                return 'htmlmixed';
            case 'css':
                return 'css';
            case 'js':
                return 'javascript';
            case 'py':
                return 'python';
            default:
                return 'text/plain';
        }
    }
    
    function updateTerminalVisibility(){
        const currentFile = currentFiles[activePane];
        const  isPythonFile = currentFile && currentFile.endsWith('.py');
        const isHtmlFile = currentFile && currentFile.endsWith('.html');

        runBtn.style.display = isPythonFile ? 'block': 'none';
        previewBtn.style.display = isHtmlFile ? 'block' : 'none';
        
        terminalContainer.style.display = isPythonFile ? 'flex' : 'none';
        terminalResizer.style.display = isPythonFile ? 'block' : 'none';
        
        previewContainer.style.display = isHtmlFile ? 'flex' : 'none';
        previewResizer.style.display = isHtmlFile ? 'block' : 'none';
    }
    

    function updateEmptyMessage() {
        const fileItems = document.querySelectorAll('.file-item:not(.editing)');
        emptyMessage.style.display = fileItems.length === 0 ? 'block' : 'none';
    }

    function updateEditorView() {
        const hasOpenFile = Object.values(openFiles).some(arr => arr && arr.length > 0);
        if(hasOpenFile) {
            editorPlaceholder.style.display = 'none';
            document.querySelector('.editor-group').style.display = 'flex';
        }
        else {
            editorPlaceholder.style.display = 'flex';
            document.querySelector('.editor-group').style.display = 'none';
        }
        updatePaneLayout();
        updateTerminalVisibility();
    }

    function saveFiles() {
        localStorage.setItem('editorFiles', JSON.stringify(files));
        localStorage.setItem('openFiles', JSON.stringify(openFiles));
        localStorage.setItem('currentFiles', JSON.stringify(currentFiles));
    }

    function saveCurrentFile(paneId) {
        if (currentFiles[paneId]) {
            files[currentFiles[paneId]] = editors[paneId].getValue();
            saveFiles();
        }
    }
    
    function loadFiles() {
        const savedFiles = localStorage.getItem('editorFiles');
        if (savedFiles) {
            files = JSON.parse(savedFiles);
            fileList.innerHTML = '';
            Object.keys(files).sort().forEach(createFileItem);
        }

        const savedOpenFiles = localStorage.getItem('openFiles');
        if (savedOpenFiles) {
            const loadedOpen = JSON.parse(savedOpenFiles);
            openFiles = {
                1: loadedOpen[1] || [],
                2: loadedOpen[2] || []
            };
        }

        const savedCurrentFiles = localStorage.getItem('currentFiles');
        if (savedCurrentFiles) {
            const loadedCurrent = JSON.parse(savedCurrentFiles);
            currentFiles = {
                1: loadedCurrent[1] || null,
                2: loadedCurrent[2] || null
            };
        }

        [1, 2].forEach(paneId => {
            openFiles[paneId].forEach(filename => {
                if (files[filename] !== undefined) createTab(filename, paneId);
            });
            if (currentFiles[paneId] && files[currentFiles[paneId]] !== undefined) {
                switchToFile(currentFiles[paneId], paneId);
            }
        });

        updateEmptyMessage();
        updateEditorView();
    }

    function switchToFile(filename, paneId, focusPane = true) {
        if (!files.hasOwnProperty(filename)) return;

        if (focusPane) activePane = paneId;

        const otherPaneId = paneId === 1 ? 2 : 1;
        if (openFiles[otherPaneId].includes(filename)) {
            closeTab(filename, otherPaneId);
        }

        if (!openFiles[paneId].includes(filename)) {
            openFiles[paneId].push(filename);
            createTab(filename, paneId);
        }

        saveCurrentFile(paneId);
        currentFiles[paneId] = filename;
        editors[paneId].setValue(files[filename] || '');
        editors[paneId].setOption('mode', getModeForFilename(filename));
        editors[paneId].focus();

        document.querySelectorAll('.file-item').forEach(item => {
            const f = item.dataset.filename;
            const isActive = f === currentFiles[1] || f === currentFiles[2];
            item.classList.toggle('active', isActive);
        });

        [1, 2].forEach(pId => {
            tabsContainers[pId].querySelectorAll('.tab-item').forEach(item => {
                item.classList.toggle('active', item.dataset.filename === currentFiles[pId]);
            });
        });

        updateEditorView();
        saveFiles();
    }

    function createTab(filename, paneId) {
        const tab = document.createElement('div');
        tab.className = 'tab-item';
        tab.dataset.filename = filename;

        const tabName = document.createElement('span');
        tabName.textContent = filename;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close-btn';
        closeBtn.innerHTML = '&times;';

        tab.appendChild(tabName);
        tab.appendChild(closeBtn);
        tabsContainers[paneId].appendChild(tab);
    }

    function closeTab(filename, paneId) {
        openFiles[paneId] = openFiles[paneId].filter(f => f !== filename);

        const tabToRemove = tabsContainers[paneId].querySelector(`.tab-item[data-filename="${filename}"]`);
        if (tabToRemove) tabToRemove.remove();

        if (currentFiles[paneId] === filename) {
            if (openFiles[paneId].length > 0) {
                switchToFile(openFiles[paneId][openFiles[paneId].length - 1], paneId, false);
            } else {
                currentFiles[paneId] = null;
                editors[paneId].setValue('');
                if (paneId === 2) {
                    editorPanes[2].style.display = 'none';
                    resizer.style.display = 'none';
                }
            }
        }

        updateEditorView();
        saveFiles();
    }

    function getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        if (supportedExtensions.includes(extension)) {
            return `icons/${extension}.svg`;
        }
        return 'icons/text.svg';
    }

    function renderFileItemContent(fileItem, filename) {
        fileItem.innerHTML = '';
        const icon = document.createElement('img');
        icon.src = getFileIcon(filename);

        const text = document.createElement('span');
        text.textContent = filename;

        fileItem.appendChild(icon);
        fileItem.appendChild(text);
    }

    function createFileItem(filename) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.filename = filename;
        renderFileItemContent(fileItem, filename);
        fileList.appendChild(fileItem);
        return fileItem;
    }

    function hideContextMenu() {
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        contextFile = null;
    }

    function updatePaneLayout() {
        const isSplit = openFiles[2].length > 0;
        if (isSplit) {
            resizer.style.display = 'block';
            editorPanes[2].style.display = 'flex';
            if (!editorPanes[1].style.width || editorPanes[1].style.width === '100%') {
                editorPanes[1].style.width = '50%';
                editorPanes[2].style.width = '50%';
            }
        } else {
            resizer.style.display = 'none';
            editorPanes[2].style.display = 'none';
            editorPanes[1].style.width = '100%';
        }
        Object.values(editors).forEach(e => e.refresh());
    }

    function initTerminalResizer(){
        let isResizing = false;

        terminalResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
        });

        function handleMouseMove(e){
            if(!isResizing) return;
            const mainContent = document.querySelector('.main-content');
            const newTerminalHeight = mainContent.getBoundingClientRect().bottom - e.clientY;
            if(newTerminalHeight > 50 &&  newTerminalHeight < mainContent.offsetHeight - 100){
                terminalContainer.style.height = `${newTerminalHeight}px`;
                Object.values(editors).forEach(ed => ed.refresh());
            }
        }

        function stopResize(){
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
        }
    }

    async function runPythonCode(){
        if(!pyodide || !currentFiles[activePane]) return;
        const code = editors[activePane].getValue();
        if(!code.trim()) return;

        term.writeln(`\n\u001b[1;32m>>> Running ${currentFiles[activePane]}...\u001b[0m`);

        try {
            pyodide.globals.set('print_buffer', []);
            pyodide.runPython(`
                import sys
                import io
                sys.stdout = io.StringIO()
                sys.stderr = io.StringIO()`
            );

            let result = await pyodide.runPythonAsync(code);

            const stdout = pyodide.runPython('sys.stdout.getvalue()');
            const stderr = pyodide.runPython('sys.stderr.getvalue()');

            if(stdout) term.write(stdout.replace(/\n/g, '\r\n'));
            if (stderr) term.write(`\u001b[1;31m${stderr.replace(/\n/g, '\r\n')}\u001b[0m`);

            if(result !== undefined){
                term.writeln(`\u001b[1;34m\r\n<-- ${result}\u001b[0m`);
            }
        } catch(err) {
             term.writeln(`\u001b[1;31m${err.toString().replace(/\n/g, '\r\n')}\u001b[0m`);
        }
    }
    function initPreviewResizer(){
        let isResizing = false;

        previewResizer.addEventListener('mousedown', (e) => {
            isResizing  = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseUp', stopResize);
        })
         function handleMouseMove(e) {
                if(!isResizing) return;
                const mainContent = document.querySelector('.main-content');
                const newPreviewHeight = mainContent.getBoundingClientRect().bottom - e.clientY;
                if(newPreviewHeight > 50 && newPreviewHeight < mainContent.offsetHeight - 100){
                    previewContainer.style.height = `${newPreviewHeight}px`;
                    Object.values(editors).forEach(ed => ed.refresh());
                }
            }
        function stopResize(){
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    }

    function startFileEdit(fileItem, oldFilename) {
        fileItem.classList.add('editing');
        fileItem.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldFilename || 'newfile.txt';

        const helperText = document.createElement('div');
        helperText.className = 'helper-text';
        helperText.textContent = 'Press Enter to save, Esc to cancel.';

        fileItem.appendChild(input);
        fileItem.appendChild(helperText);

        input.focus();
        input.select();

        const finishEdit = () => {
            input.removeEventListener('blur', finishEdit);
            input.removeEventListener('keydown', handleKey);

            const newFilename = input.value.trim();

            if (!newFilename || (oldFilename && newFilename === oldFilename)) {
                cancelEdit();
                return;
            }
            if (!newFilename.includes('.')) {
                helperText.textContent = 'Please include a file extension.';
                helperText.classList.add('error');
                resetInputListeners();
                return;
            }
            if (!isValidFileExtension(newFilename)) {
                helperText.textContent = 'Unsupported file type!';
                helperText.classList.add('error');
                resetInputListeners();
                return;
            }
            if (files.hasOwnProperty(newFilename)) {
                helperText.textContent = 'File already exists!';
                helperText.classList.add('error');
                resetInputListeners();
                return;
            }

            if (oldFilename) {
                files[newFilename] = files[oldFilename];
                delete files[oldFilename];

                [1, 2].forEach(paneId => {
                    if (openFiles[paneId].includes(oldFilename)) {
                        openFiles[paneId] = openFiles[paneId].map(f => f === oldFilename ? newFilename : f);
                        const tab = tabsContainers[paneId].querySelector(`.tab-item[data-filename="${oldFilename}"]`);
                        if (tab) {
                            tab.dataset.filename = newFilename;
                            tab.querySelector('span').textContent = newFilename;
                        }
                    }
                    if (currentFiles[paneId] === oldFilename) currentFiles[paneId] = newFilename;
                });

            } else {
                files[newFilename] = '';
            }
            saveFiles();

            fileItem.classList.remove('editing');
            renderFileItemContent(fileItem, newFilename);
            fileItem.dataset.filename = newFilename;

            if (!oldFilename) {
                switchToFile(newFilename, activePane);
            } else {
                [1, 2].forEach(paneId => {
                    if (currentFiles[paneId] === newFilename) {
                        const fileItemInList = document.querySelector(`.file-item[data-filename="${newFilename}"]`);
                        if (fileItemInList) fileItemInList.classList.add('active');
                    }
                });
            }
            updateEmptyMessage();
        };

        const cancelEdit = () => {
            if (oldFilename) {
                fileItem.classList.remove('editing');
                renderFileItemContent(fileItem, oldFilename);
            } else {
                fileItem.remove();
            }
            updateEmptyMessage();
        };

        const handleKey = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        };

        const resetInputListeners = () => {
            input.addEventListener('blur', finishEdit);
            input.addEventListener('keydown', handleKey);
        };

        resetInputListeners();
    }

    function initResizer() {
        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
        });

        function handleMouseMove(e) {
            if (!isResizing) return;

            const container = editorSection.querySelector('.editor-group');
            const containerRect = container.getBoundingClientRect();
            const pane1MinWidth = 150;
            const pane2MinWidth = 150;

            let pane1Width = e.clientX - containerRect.left;
            let pane2Width = containerRect.right - e.clientX;

            if (pane1Width < pane1MinWidth) {
                pane1Width = pane1MinWidth;
                pane2Width = containerRect.width - pane1Width - resizer.offsetWidth;
            }

            if (pane2Width < pane2MinWidth) {
                pane2Width = pane2MinWidth;
                pane1Width = containerRect.width - pane2Width - resizer.offsetWidth;
            }

            editorPanes[1].style.width = `${pane1Width}px`;
            editorPanes[2].style.width = `${pane2Width}px`;

            editors[1].refresh();
            editors[2].refresh();
        }

        function stopResize() {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
        }
    }

    editors[1].on('change', () => saveCurrentFile(1));
    editors[2].on('change', () => saveCurrentFile(2));

    newFileBtn.addEventListener('click', () => {
        const tempFileItem = document.createElement('div');
        tempFileItem.className = 'file-item';
        fileList.appendChild(tempFileItem);
        startFileEdit(tempFileItem, null);
        updateEmptyMessage();
    });

    fileList.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (fileItem && !fileItem.classList.contains('editing')) {
            switchToFile(fileItem.dataset.filename, activePane);
        }
    });

    [1, 2].forEach(paneId => {
        tabsContainers[paneId].addEventListener('click', (e) => {
            const target = e.target;
            activePane = paneId;

            if (target.classList.contains('tab-close-btn')) {
                e.stopPropagation();
                const filename = target.parentElement.dataset.filename;
                closeTab(filename, paneId);
            } else {
                const tabItem = target.closest('.tab-item');
                if (tabItem) {
                    switchToFile(tabItem.dataset.filename, paneId);
                }
            }
        });

        editors[paneId].on('focus', () => {
            activePane = paneId;
        });
    });

    fileList.addEventListener('contextmenu', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (contextMenu && fileItem && !fileItem.classList.contains('editing')) {
            e.preventDefault();
            contextFile = fileItem.dataset.filename;
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.display = 'block';
        } else {
            hideContextMenu();
        }
    });

    if (renameFileBtn) {
        renameFileBtn.addEventListener('click', () => {
            if (contextFile) {
                const fileItem = Array.from(fileList.children).find(item => item.dataset.filename === contextFile);
                if (fileItem) {
                    startFileEdit(fileItem, contextFile);
                }
            }
            hideContextMenu();
        });
    }

    if (splitViewBtn) {
        splitViewBtn.addEventListener('click', () => {
            if (contextFile) {
                switchToFile(contextFile, 2);
            }
            hideContextMenu();
        });
    }

    if (deleteFileBtn) {
        deleteFileBtn.addEventListener('click', () => {
            if (contextFile && confirm(`Are you sure you want to delete "${contextFile}"?`)) {
                const fileItem = Array.from(fileList.children).find(item => item.dataset.filename === contextFile);
                if (fileItem) {
                    fileItem.remove();
                }
                [1, 2].forEach(paneId => {
                    if (openFiles[paneId].includes(contextFile)) {
                        closeTab(contextFile, paneId);
                    }
                });

                delete files[contextFile];

                updateEmptyMessage();
                saveFiles();
            }
            hideContextMenu();
        });
    }

    runBtn.addEventListener('click', runPythonCode);

    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    initResizer();
    initTerminalResizer();
    loadFiles();
    initPyodide();
    
});
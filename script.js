document.addEventListener('DOMContentLoaded', function() {
    const editors = {1: CodeMirror.fromTextArea(document.getElementById('codeEditor1'), {
        lineNumbers: true,
        theme: 'dracula',
        mode: 'text/plain',
        extraKeys: {"Ctrl-Space": "autocomplete"},
        hintOptions: { completeSingle: false}
    }),
    2: CodeMirror.fromTextArea(document.getElementById('codeEditor2'), {
        lineNumbers: true,
        theme: 'dracula',
        mode: 'text/plain',
        extraKeys: {"Ctrl-Space": "autocomplete"},
        hintOptions: { completeSingle: false}
    })
};

Object.values(editors).forEach(editor => {
    editor.on('inputRead', function(cm, change){
        if(change.origin === "+input" && change.text[0].trim().length > 0){
            cm.showHint({completeSingle: false});
        }
    });
});

    editor.on('inputRead', function(cm, change){
        if(change.origin === "+input" && change.text[0].trim().length > 0){
            cm.showHint({completeSingle: false});
        }
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
    const tabsContainer = document.getElementById('tabsContainer');
    const editorPanes = {
        1: document.getElementById('editorPane1'),
        2: document.getElementById('editorPane2')
    };
    
    let files = {};
    let currentFile = {1: null, 2: null};
    let contextFile = null;
    let openFiles = {1: [], 2: []};
    let activePane = 1;

    const supportedExtensions = ['txt', 'html', 'css', 'js'];

    function isValidFileExtension(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        return supportedExtensions.includes(extension);
    }

    function getModeForFilename(filename){
        const extension = filename.split('.').pop().toLowerCase();
        switch(extension){
            case 'html':
                return 'htmlmixed';
            case 'css':
                return 'css';
            case 'js':
                return 'javascript';
            default:
                return 'text/plain';
        }
    }

    function updateEmptyMessage() {
        const fileItems = document.querySelectorAll('.file-item:not(.editing)');
        emptyMessage.style.display = fileItems.length === 0 ? 'block' : 'none';
    }
    function updateEditorView(){
        const hasOpenFile = Object.values(currentFile).some(arr => arr.length > 0);
        if(hasOpenFile) {
            editorPlaceholder.style.display = 'none';
            editorSection.style.display = 'flex';
            Object.values(editors).forEach(e => e.refresh());
        } else {
            editorPlaceholder.style.display = 'flex';
            editorSection.style.display = 'none';
        }
    }
    function saveFiles(){
        localStorage.setItem('editorFiles', JSON.stringify(files));
        localStorage.setItem('openFiles', JSON.stringify(openFiles));
        localStorage.setItem('currentFile', JSON.stringify(currentFiles));
    }
    function saveCurrentFile(paneId) {
        if(currentFiles[paneId]) {
            files[currentFiles[paneId]] = editors[paneId].getValue();
            saveFiles();
        }
    }

    function loadFiles() {
        const savedFiles = localStorage.getItem('editorFiles');
        if(savedFiles) {
            files = JSON.parse(savedFiles);
            fileList.innerHTML = '';
            Object.keys(files).sort().forEach(createFileItem);
        }

        const savedOpenFiles = localStorage.getItem('openFiles');
        if(savedOpenFiles){
            openFiles = JSON.parse(savedOpenFiles);
            if(!openFiles[1]) openFiles[1] = [];
            if(!openFiles[2]) openFiles[2] = [];
        }

        const savedCurrentFiles = localStorage.getItem('currentFiles');
        if(savedCurrentFiles){
            currentFiles = JSON.parse(savedCurrentFiles);
        }
        [1, 2].forEach(paneId => {
            openFiles[paneId].forEach(filename => {
                if(files[filename] !== undefined) createTab(filename, paneId);
            });
            if(currentFiles[paneId] && files[currentFiles[paneId]] !== undefined){
                switchToFile(currentFiles[paneId], paneId);
            }
        });

        if(openFiles[2].length > 0){
            editorPanes[2].style.display = 'flex';

            updateEmptyMessage();
            updateEditorView();
        }
    }

    function switchToFile(filename) {
        if(!files.hasOwnProperty(filename)) return;

        if(focusPane) activePane = paneId;

        const otherPaneId = paneId === 1 ? 2 : 1;
        if(openFiles[otherPaneId].includes(filename)) {
            closeTab(filename, otherPaneId);
        }

        if(!openFiles[paneId].includes(filename)){
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
            tabsContainer[pId].querySelectorAll('.tab-item').forEach(item => {
                item.classList.toggle('active', item.dataset.filename === currentFiles[pId]);
            });
        });

        updateEditorView();
        saveFiles();
    }

    function createTab(filename, paneId){
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
        tabsContainer[paneId].appendChild(tab);
    }

    function closeTab(filename) {
        openFiles = openFiles.filter(f => f !== filename);

        const tabToRemove = tabsContainer.querySelector(`.tab-item[data-filename="${filename}"]`);
        if(tabToRemove) tabToRemove.remove();

        if(currentFiles[paneId] === filename){
            if(openFiles[paneId].length > 0){
                switchToFile(openFiles[paneId][openFiles[paneId].length - 1], paneId, false);
            } else {
                currentFiles[paneId] = null;
                editors[paneId].setValue('');
                if(paneId === 2){
                    editorPanes[2].style.display = 'none';
                } 
            }
        }

        if(!openFiles[1].length && !openFiles[2].length){
            updateEditorView();
        }
        saveFiles();
    }

    function getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        if(supportedExtensions.includes(extension)){
            return `icons/${extension}.svg`;
        }
        return 'icons/text.svg';
    }

    function renderFileItemContent(fileItem, filename){
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
        fileItem.textContent = filename;
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
                    if(openFiles[paneId].includes(oldFilename)){
                        openFiles[paneId] = openFiles[paneId].map(f => f === oldFilename ? newFilename : f);
                        const tab = tabsContainers[paneId].querySelector(`.tab-item[data-filename="${oldFilename}"]`);
                        if(tab){
                            tab.dataset.filename = newFilename;
                            tab.querySelector('span').textContent = newFilename;
                        }
                    }
                    if(currentFiles[paneId] === oldFilename) currentFiles[paneId] = newFilename;
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

    editors[1].on('change', () => saveCurrentFile(1));
    editors[2].on('change', () => saveCurrentFile(2))

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
    [1,2]
    tabsContainer.addEventListener('click', (e) => {
        const target = e.target;

        if(target.classList.contains('tab-close-btn')) {

            e.stopPropagation();
            const filename = target.parentElement.dataset.filename;
            closeTab(filename);
        } else {
            const tabItem = target.closest('.tab-item');
            if(tabItem) {
                switchToFile(tabItem.dataset.filename);
            }
        }
    })

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

    if (deleteFileBtn) {
        deleteFileBtn.addEventListener('click', () => {
            if (contextFile && confirm(`Are you sure you want to delete "${contextFile}"?`)) {
                const fileItem = Array.from(fileList.children).find(item => item.dataset.filename === contextFile);
                if(fileItem) {
                    fileItem.remove();
                }
                if(openFiles.includes(contextFile)){
                    closeTab(contextFile);
                }
                delete files[contextFile];

                updateEmptyMessage();
                saveFiles();
            }
            hideContextMenu();
        });
    }

    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    loadFiles();
    updateEmptyMessage();
    updateEditorView();
});
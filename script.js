document.addEventListener('DOMContentLoaded', function() {
    const editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
        lineNumbers: true,
        theme: 'dracula',
        mode: 'text/plain',
        extraKeys: {"Ctrl-Space": "autocomplete"},
        hintOptions: {
            completeSingle: false
        }
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
    const editorSection = document.querySelector('.editor-section');
    const editorPlaceholder = document.getElementById('editor-placeholder');
    const tabsContainer = document.getElementById('tabsContainer');
    const tabsContainer2 = document.querySelector('tabsContainer');
    

    let files = {};
    let currentFile = null;
    let contextFile = null;
    let openFiles = [];

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
        if(currentFile){
            editorPlaceholder.style.display = 'none';
            editorSection.style.display = 'flex';
            editor.refresh();
        } else {
            editorPlaceholder.style.display = 'flex';
            editorSection.style.display = 'none';
        }
    }
    function saveFiles() {
        localStorage.setItem('editorFiles', JSON.stringify(files));
        localStorage.setItem('openFiles', JSON.stringify(openFiles));
        localStorage.setItem('currentFile', currentFile);
    }

    function saveCurrentFile() {
        if (currentFile) {
            files[currentFile] = editor.getValue();
            saveFiles();
        }
    }

    function loadFiles() {
        const savedFiles = localStorage.getItem('editorFiles');
        if (savedFiles) {
            files = JSON.parse(savedFiles);
            fileList.innerHTML = '';
            Object.keys(files).sort().forEach(createFileItem);
            updateEmptyMessage();
        }

        const savedOpenFiles = localStorage.getItem('openFiles');
        if(savedOpenFiles){
            openFiles = JSON.parse(savedOpenFiles);
            openFiles.forEach(filename => {
                if(files[filename] !== undefined) createTab(filename);
            });
        }

        const savedCurrentFile = localStorage.getItem('currentFile');
        if(savedCurrentFile && files[savedCurrentFile] !== undefined){
            switchToFile(savedCurrentFile);
        } else {
            updateEditorView();
        }
    }

    function switchToFile(filename) {
        if(!files.hasOwnProperty(filename)) return;

        if(!openFiles.includes(filename)){
            openFiles.push(filename);
            createTab(filename);
        }

        saveCurrentFile();
        currentFile = filename;
        editor.setValue(files[filename] || '');
        editor.setOption('mode', getModeForFilename(filename));

        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filename === filename);
        });
        document.querySelectorAll('.tab-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filename === filename);
        });

        updateEditorView();
        saveFiles();
    }

    function createTab(filename){
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
        tabsContainer.appendChild(tab);
    }

    function closeTab(filename) {
        openFiles = openFiles.filter(f => f !== filename);

        const tabToRemove = tabsContainer.querySelector(`.tab-item[data-filename="${filename}"]`);
        if(tabToRemove) tabToRemove.remove();

        if(currentFile === filename){
            if(openFiles.length > 0){
                switchToFile(openFiles[openFiles.length - 1]);
            } else {
                currentFile = null;
                editor.setValue('');
                updateEditorView();
            }
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
                
                if(openFiles.includes(oldFilename)){
                    openFiles = openFiles.map(f => f === oldFilename ? newFilename : f);
                    const tab = tabsContainer.querySelector(`.tab-item[data-filename="${oldFilename}"]`);
                    if(tab){
                        tab.dataset.filename = newFilename;
                        tab.querySelector('span').textContent = newFilename;
                    }
                }
                if(currentFile === oldFilename) currentFile = newFilename;

            } else {
                files[newFilename] = '';
            }
            saveFiles();

            fileItem.classList.remove('editing');
            renderFileItemContent(fileItem, newFilename);
            fileItem.dataset.filename = newFilename;

            if (!oldFilename) {
                switchToFile(newFilename);
            } else if (currentFile === newFilename) {
                fileItem.classList.add('active');
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

    editor.on('change', saveCurrentFile);

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
            switchToFile(fileItem.dataset.filename);
        }
    });

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
document.addEventListener('DOMContentLoaded', function(){
    const editor = document.getElementById('codeEditor');
    const newFileBtn = document.getElementById('newFileBtn');
    const fileList = document.querySelector('.file-list');
    const emptyMessage = document.querySelector('.empty-message');
    const contextMenu = document.getElementById('contextMenu');
    const renameFileBtn = document.getElementById('renameFileBtn');
    const deleteFileBtn = document.getElementById('deleteFileBtn');


    let files = {};
    let currentFile = null;
    let contextFile = null;

    const supportedExtensions = ['txt', 'html', 'css', 'js'];

    function isValidFileExtension(filename){
        const extension = filename.split('.').pop().toLowerCase();
        return supportedExtensions.includes(extension);
    }
    function getFileExtension(filename){
        return filename.split('.').pop().toLowerCase();
    }

    function updateEmptyMessage(){
        const fileItems = document.querySelectorAll('.file-item:not(.editing)');
        if(fileItems.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
        }
    }

    function loadFiles(){
        const savedFiles = localStorage.getItem('editorFiles');
        if(savedFiles){
            files = JSON.parse(savedFiles);
            Object.keys(files).forEach(filename => {
                createFileItem(filename);
            });
            updateEmptyMessage();
        }
    }
    function saveFiles(){
        localStorage.setItem('editorFiles', JSON.stringify(files));
    }
    function saveCurrentFile(){
        if(currentFile){
            files[currentFile] = editor.value;
            saveFiles();
        }
    }
    function loadFiles() {
        const savedFiles = localStorage.getItem('editorFiles');
        if(savedFiles) {
            files = JSON.parse(savedFiles);
            fileList.innerHTML = '';
            Object.keys(files).sort().forEach(createFileItem);
            updateEmptyMessage();
        }
    }

    function switchToFile(filename){
        saveCurrentFile();

        currentFile = filename;
        editor.value = files[filename] || '';

        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
            if(item.textContent === filename){
                item.classList.add('active');
            }
        });
    }

    function createFileItem(filename){
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.textContent = filename;
        fileItem.dataset.filename = filename;
        fileList.appendChild(fileItem);
        return fileItem;
    }
    function hideContextMenu() {
        contextMenu.style.display = 'none';
        contextFile = null;
    }
    function startFileEdit(fileItme, oldFilename) {
        fileItem.classList.add('editing');
        fileItem.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldFilename || 'newfile.txt';
        const helperText = document.createElement('div');
        helperText.className = 'helper-text';
        helperText.textContent = 'Press Enter to save, Escape to cancel.'

        fileItem.appendChild(input);
        fileItem.appendChild(helperText);

        input.focus();
        input.select();

        const finishEdit = (e) => {
            input.removeEventListener('blur', finishEdit);
            input.removeEventListener('keydown', handleKey);

            const newFilename = input.value.trim();

            if(!newFilename || (oldFilename && newFilename === oldFilename)){
                cancelEdit();
                return;
            }
            if(!newFilename.includes('.')){
                helperText.textContent = 'Please include a file extension!.';
                helperText.classList.add('error');
                resetInputListeners();
                return;
            }
            if(!isValidFileExtension(newFilename)){
                helperText.textContent ='Unsupported file type!';
                helperText.classList.add('error');
                resetInputListeners();
                return;
            }
            if(files.hasOwnProperty(newFilename)){
                helperText.textContent = 'File already exists!';
                helperText.classList.add('error');
                resetInputListeners();
                return;
            }

            if(oldFilename) {
                files[newFilename] = files[oldFilename];
                delete files[oldFilename];
                if(currentFile === oldFilename){
                    currentFile = newFilename;
                }
            } else {
                files[newFilename] = '';
            }
            saveFiles();

            fileItem.classList.remove('editing');
            fileItem.textContent = newFilename;
            fileItem.dataset.filename = newFilename;

            if(!oldFilename){
                switchToFile(newFilename);
            } else if (currentFile === newFilename){
                fileItem.classList.add('active');
            }
            updateEmptyMessage();
        };
        const cancelEdit = () => {
            if(oldFilename){
                fileItem.classList.remove('editing');
                fileItem.textContent = oldFilename;
            } else {
                fileItem.remove();
            }
            updateEmptyMessage();
        };

        const handleKey = (e) => {
            if(e.key === 'Enter'){
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape'){
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


    editor.addEventListener('input', function(){
        saveCurrentFile();
    });

    newFileBtn.addEventListener('click', () => {
        const tempFileItem = document.createElement('div');
        fileList.appendChild(tempFileItem);
        startFileEdit(tempFileItem, null);
        updateEmptyMessage();
    });

    fileList.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if(fileItem && !fileItem.classList.contains('editing')){
            switchToFile(fileItem.dataset.filename);
        }
    });
    fileList.addEvenetListener('contextmenu', (e) => {
        const fileItem = e.target.closest('.file-item');
        if(fileItem && !fileItme.classList.constains('editing')){
            e.preventDefault();
            contextFile = fileItem.dataset.filename;
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.display = 'block';
        } else {
            hideContextMenu();
        }
    });

    renameFileBtn.addEventListener('click', () => {
        if(contextFile){
            const fileItem = Array.from(fileList.children).find(item => item.dataset.filename === contextFile);
            if(fileItem){
                startFileEdit(fileItem, contextFile);
            }
        }
        hideContextMenu();
    });
    deleteFileBtn.addEventListener('click', () => {
        if(contextFile && confirm(`Are you sure you want to delete "${contextFile}?`)){
            const fileItem = Array.from(fileList.children).find(item => item.dataset.filename === contextFile);
            if(fileItem) fileItem.remove();

            delete files[contextFile];
            saveFiles();

            if(currentFile === contextFile){
                currentFile = null;
                editor.value = '';
                const remainingFiles = Object.keys(files);
                if(remainingFiles.length > 0){
                    switchToFile(remainingFiles[0]);
                }
            }
            updateEmptyMessage();
        }
        hideContextMenu();
    });
    document.addEvenetListener('click', (e) => {
        if(!contextMenu.containes(e.target)){
            hideContextMenu();
        }
    });

    loadFiles();
    updateEmptyMessage();
    
});
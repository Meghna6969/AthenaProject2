document.addEventListener('DOMContentLoaded', function(){
    const editor = document.getElementById('codeEditor');
    const newFileBtn = document.getElementById('newFileBtn');
    const fileList = document.querySelector('.file-list');
    const emptyMessage = document.querySelector('.empty-message');

    let files = {};
    let currentFile = null;

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

        fileItem.addEventListener('click', function(){
            if(this.classList.contains('editing')) return;
            switchToFile(filename);
        })

        fileList.appendChild(fileItem);
        return fileItem;
    }

    editor.addEventListener('keydown', function(e){
        if(e.key === 'Tab'){
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }
    });

    editor.addEventListener('input', function(){
        saveCurrentFile();
    });

    const savedContent = localStorage.getItem('editorContent');
    if(savedContent){
        editor.value = savedContent;
    }

    newFileBtn.addEventListener('click', function() {
        const newFileItem = document.createElement('div');
        newFileItem.className = 'file-item editing';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '';
        input.value = 'newfile.txt';

        const helperText = document.createElement('div');
        helperText.className = 'helper-text';
        helperText.textContent = 'Supported: .html, .css, .js, .txt';
        
        newFileItem.appendChild(input);
        newFileItem.appendChild(helperText);
        fileList.appendChild(newFileItem);

        input.focus();
        input.select();

        let isCompleting = false;

        function completeEdit() {
            if(isCompleting) return;
            isCompleting = true;

            
            const filename = input.value.trim();

            if(!filename){
                newFileItem.remove();
                updateEmptyMessage();
                return;
            }
            if(!filename.includes('.')) {
                alert('Please include a file extension');
                isCompleting = false;
                input.focus();
                input.select();
                return;
            }
            if(!isValidFileExtension(filename)){
                alert('Unsupported file type! Choose from .html, .css, .js, .txt');
                isCompleting = false;
                input.focus();
                input.select();
                return;
            }

            if(files.hasOwnProperty(filename)){
                alert('File already exists!');
                isCompleting = false;
                input.focus();
                input.select();
                return;
            }

                files[filename] = '';
                saveFiles();

                newFileItem.classList.remove('editing');
                newFileItem.innerHTML = '';
                newFileItem.textContent = filename;

                newFileItem.addEventListener('click', function(){
                    switchToFile(filename);
                });
                switchToFile(filename);
                updateEmptyMessage();
        }

        function cancelEdit(){
            if(isCompleting) return;
            newFileItem.remove();
            updateEmptyMessage();
        }
        function handleKeydown(e){
            if(e.key === 'Enter'){
                e.preventDefault();
                e.stopPropagation();
                completeEdit();
            } else if (e.key === 'Escape'){
                e.preventDefault();
                e.stopPropagation();
                cancelEdit();
            }
        }

        function handleBlur(){
            setTimeout(() => {
                if(!isCompleting){
                    completeEdit();
                }
            }, 100);
        }
        input.addEventListener('keydown', handleKeydown);
        
        input.addEventListener('blur', handleBlur);
    });
    loadFiles();

    updateEmptyMessage();
});
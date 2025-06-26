document.addEventListener('DOMContentLoaded', function(){
    const editor = document.getElementById('codeEditor');
    const newFileBtn = document.getElementById('newFileBtn');
    const fileList = document.querySelector('.file-list');
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
        localStorage.setItem('editorContent', this.value);
    });

    const savedContent = localStorage.getItem('editorContent');
    if(savedContent){
        editor.value = savedContent;
    }

    function setupFileClickHandlers() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            item.addEventListener('click', function(){
                if(this.classList.contains('editing')) return;

                fileItems.forEach(f => f.classList.remove('active'));
                this.classList.add('active');
                
            })
        })
    }
    newFileBtn.addEvenetListener('click', function(){
        const newFileItem = document.createElement('div');
        newFileItem.className = 'file-item editing';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'filename.ext';
        input.value = 'newfile.txt';

        newFileItem.appendChild(input);
        fileList.appendChild(newFileItem);

        input.focus();
        input.select();

        function completeEdit() {
            const fileName = input.value.trim();
            if(filename){
                newFileItem.classList.remove('editing');
                newFileItem.textContent = filename;
                setupFileClickHandlers();
            } else {
                newFileItem.remove();
            }
        }
    })

    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        item.addEventListener('click', function(){
            fileItems.forEach(f => f.classList.remove('active'));
            this.classList.add('active'); 
        })
    })
})

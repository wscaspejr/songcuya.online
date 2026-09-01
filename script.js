fetch("./models.json")
    .then(response => response.json())
    .then(data => {
        const list = document.getElementById('model-list');
        if (list) {
            list.innerHTML = '';
                                data.chatModels.forEach(model => {
                const li = document.createElement('li');
                if (model.value === 'badyoung') {
                    li.classList.add('special-model');
                    li.innerHTML = `${model.label} <span class="badge">Custom</span>`;
                } else {
                    li.textContent = model.label;
                }
                list.appendChild(li);
            });
        }
    })
    .catch(error => console.error('Error loading models:', error));
// NAVBAR
let menuToggle = document.querySelector('.toggle')
let sidebar = document.querySelector('.sidebar')
let name = document.querySelector('.toggle-logo');
menuToggle.onclick = function () {
    menuToggle.classList.toggle('active')
    sidebar.classList.toggle('active')
    name.classList.toggle('active')
}

let list = document.querySelectorAll('.list');
for (let i = 0; i < list.length; i++) {
    list[i].onclick = function () {
        let j = 0;
        while (j < list.length) {
            list[j++].className = 'list';
        }
        list[i].className = 'list active';
    }
}
// HEADER
let dropdown = document.querySelector('.dropdown')
dropdown.onclick = function () {
    dropdown.classList.toggle('active')
}

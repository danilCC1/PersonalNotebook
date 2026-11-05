const STORAGE_KEY = "personalNotebookNotes";
const MAX_LENGTH = 500;

class Note {
    constructor(title, text, date, tags) {
        this.id = String(Date.now()) + "-" + Math.random().toString(36).slice(2);
        this.title = title;
        this.text = text;
        this.date = date;
        this.tags = tags;
    }
}

class NotebookManager {
    constructor() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            this.notes = Array.isArray(saved) ? saved : [];
        } catch (error) {
            this.notes = [];
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    }

    add(note) {
        this.notes.push(note);
        this.save();
    }

    edit(id, title, text, date, tags) {
        const note = this.notes.find(item => item.id === id);
        if (!note) return;

        note.title = title;
        note.text = text;
        note.date = date;
        note.tags = tags;
        this.save();
    }

    remove(id) {
        this.notes = this.notes.filter(item => item.id !== id);
        this.save();
    }

    search(query) {
        const pattern = new RegExp(escapeRegex(query), "i");
        return this.notes.filter(note =>
            pattern.test(note.title) || pattern.test(note.text)
        );
    }

    filterByTag(notes, tag) {
        if (tag === "") return notes;

        return notes.filter(note =>
            note.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        );
    }

    getTags() {
        const tags = [];

        this.notes.forEach(note => {
            note.tags.forEach(tag => {
                if (!tags.includes(tag)) tags.push(tag);
            });
        });

        return tags.sort((a, b) => a.localeCompare(b, "uk"));
    }
}

const manager = new NotebookManager();

const form = document.getElementById("note-form");
const titleInput = document.getElementById("title");
const textInput = document.getElementById("text");
const dateInput = document.getElementById("date");
const tagsInput = document.getElementById("tags");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort-order");
const notesList = document.getElementById("notes-list");
const tagFilters = document.getElementById("tag-filters");
const counter = document.getElementById("char-counter");

let activeTag = "";

function today() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTags(value) {
    const tags = value.split(",")
        .map(tag => tag.trim())
        .filter(tag => tag !== "");

    return [...new Set(tags)];
}

function checkDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const d = new Date(0);
    d.setFullYear(year, month - 1, day);

    return d.getFullYear() === year &&
        d.getMonth() === month - 1 &&
        d.getDate() === day;
}

function validate(title, text, date, tags) {
    const errors = {};

    if (!/^[\s\S]{3,100}$/.test(title)) {
        errors.title = "Заголовок: від 3 до 100 символів.";
    }

    if (!/^[\s\S]{5,500}$/.test(text)) {
        errors.text = "Текст: від 5 до 500 символів.";
    }

    if (!checkDate(date)) {
        errors.date = "Виберіть правильну дату.";
    }

    if (tags && !/^[\p{L}\p{N}_ -]+(?:\s*,\s*[\p{L}\p{N}_ -]+)*$/u.test(tags)) {
        errors.tags = "Теги записуйте через кому, без спеціальних символів.";
    }

    return errors;
}

function showErrors(fields, errors, editForm = null) {
    for (const name of ["title", "text", "date", "tags"]) {
        const message = errors[name] || "";

        fields[name].classList.toggle("invalid", message !== "");

        const error = editForm
            ? editForm.querySelector(`[data-error="${name}"]`)
            : document.getElementById(name + "-error");

        error.textContent = message;
    }
}

function updateCounter() {
    const length = textInput.value.length;

    counter.textContent = `${length} / ${MAX_LENGTH} символів`;

    counter.classList.toggle(
        "warning",
        length >= 400 && length < 480
    );

    counter.classList.toggle("danger", length >= 480);
}

function highlight(element, value, query) {
    if (!query) {
        element.textContent = value;
        return;
    }

    const pattern = new RegExp(escapeRegex(query), "gi");
    let last = 0;

    for (const match of value.matchAll(pattern)) {
        element.append(
            document.createTextNode(value.slice(last, match.index))
        );

        const mark = document.createElement("mark");
        mark.textContent = match[0];
        element.append(mark);

        last = match.index + match[0].length;
    }

    element.append(
        document.createTextNode(value.slice(last))
    );
}

function renderTags() {
    tagFilters.innerHTML = "";

    const tags = ["", ...manager.getTags()];

    tags.forEach(tag => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "tag-btn";

        if (tag === activeTag) {
            button.classList.add("active");
        }

        button.textContent = tag || "Усі";
        button.dataset.tag = tag;

        tagFilters.append(button);
    });
}

function renderNotes() {
    notesList.innerHTML = "";

    const query = searchInput.value.trim();

    let notes = manager.search(query);
    notes = manager.filterByTag(notes, activeTag);

    switch (sortSelect.value) {
        case "date-asc":
            notes.sort((a, b) => a.date.localeCompare(b.date));
            break;

        case "title-asc":
            notes.sort((a, b) => a.title.localeCompare(b.title, "uk"));
            break;

        case "title-desc":
            notes.sort((a, b) => b.title.localeCompare(a.title, "uk"));
            break;

        default:
            notes.sort((a, b) => b.date.localeCompare(a.date));
    }

    if (notes.length === 0) {
        const message = document.createElement("p");

        message.className = "empty-message";
        message.textContent = "Нотаток не знайдено.";

        notesList.append(message);
        return;
    }

    notes.forEach(note => {
        const card = document.createElement("article");
        card.className = "note-card";
        card.dataset.id = note.id;

        const heading = document.createElement("h3");
        highlight(heading, note.title, query);

        const date = document.createElement("p");
        date.className = "note-date";
        date.textContent = note.date;

        const text = document.createElement("p");
        text.className = "note-text";
        highlight(text, note.text, query);

        const tags = document.createElement("div");
        tags.className = "note-tags";

        note.tags.forEach(tag => {
            const span = document.createElement("span");

            span.className = "note-tag";
            span.textContent = "#" + tag;

            tags.append(span);
        });

        const actions = document.createElement("div");
        actions.className = "note-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "edit-btn";
        edit.textContent = "Редагувати";

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete-btn";
        remove.textContent = "Видалити";

        actions.append(edit, remove);
        card.append(heading, date, text, tags, actions);

        notesList.append(card);
    });
}

function render() {
    renderTags();
    renderNotes();
}

function startEdit(card, note) {
    card.innerHTML = "";

    const editForm = document.createElement("form");
    editForm.className = "edit-form";
    editForm.noValidate = true;

    const values = {
        title: note.title,
        text: note.text,
        date: note.date,
        tags: note.tags.join(", ")
    };

    const labels = {
        title: "Заголовок",
        text: "Текст",
        date: "Дата",
        tags: "Теги через кому"
    };

    for (const name of ["title", "text", "date", "tags"]) {
        const label = document.createElement("label");
        label.textContent = labels[name];

        const field = document.createElement(
            name === "text" ? "textarea" : "input"
        );

        if (name !== "text") {
            field.type = name === "date" ? "date" : "text";
        }

        field.name = name;
        field.value = values[name];

        if (name === "text") field.maxLength = MAX_LENGTH;
        if (name === "title") field.maxLength = 100;

        const error = document.createElement("small");
        error.className = "error-message";
        error.dataset.error = name;

        editForm.append(label, field, error);
    }

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "save-btn";
    save.textContent = "Зберегти";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "cancel-btn";
    cancel.textContent = "Скасувати";

    actions.append(save, cancel);
    editForm.append(actions);
    card.append(editForm);
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const fields = {
        title: titleInput,
        text: textInput,
        date: dateInput,
        tags: tagsInput
    };

    const title = titleInput.value.trim();
    const text = textInput.value.trim();
    const date = dateInput.value;
    const tags = tagsInput.value.trim();

    const errors = validate(title, text, date, tags);
    showErrors(fields, errors);

    if (Object.keys(errors).length > 0) return;

    manager.add(
        new Note(title, text, date, parseTags(tags))
    );

    form.reset();
    dateInput.value = today();

    updateCounter();
    render();
});

textInput.addEventListener("input", updateCounter);
searchInput.addEventListener("input", renderNotes);
sortSelect.addEventListener("change", renderNotes);

tagFilters.addEventListener("click", event => {
    const button = event.target.closest("button[data-tag]");

    if (!button || !tagFilters.contains(button)) return;

    activeTag = button.dataset.tag;
    render();
});

notesList.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    const card = button.closest(".note-card");
    if (!card) return;

    const note = manager.notes.find(
        item => item.id === card.dataset.id
    );

    if (!note) return;

    if (button.classList.contains("edit-btn")) {
        startEdit(card, note);
    }

    if (button.classList.contains("cancel-btn")) {
        renderNotes();
    }

    if (button.classList.contains("delete-btn")) {
        if (confirm(`Видалити нотатку «${note.title}»?`)) {
            manager.remove(note.id);

            if (activeTag && !manager.getTags().includes(activeTag)) {
                activeTag = "";
            }

            render();
        }
    }
});

notesList.addEventListener("submit", event => {
    if (!event.target.classList.contains("edit-form")) return;

    event.preventDefault();

    const editForm = event.target;
    const card = editForm.closest(".note-card");
    const fields = {};

    for (const name of ["title", "text", "date", "tags"]) {
        fields[name] = editForm.elements.namedItem(name);
    }

    const title = fields.title.value.trim();
    const text = fields.text.value.trim();
    const date = fields.date.value;
    const tags = fields.tags.value.trim();

    const errors = validate(title, text, date, tags);
    showErrors(fields, errors, editForm);

    if (Object.keys(errors).length > 0) return;

    manager.edit(
        card.dataset.id,
        title,
        text,
        date,
        parseTags(tags)
    );

    if (activeTag && !manager.getTags().includes(activeTag)) {
        activeTag = "";
    }

    render();
});

dateInput.value = today();
updateCounter();
render();

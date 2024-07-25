const plugin = {
    replaceText: {
        "Tag tasks in batch": async function (app, text) {
            try {
                await this._batchTagTasks(app, text);
            } catch (err) {
                console.log(err)
                app.alert(err);
            }
        },
        "Move tasks in batch": async function (app, text) {
            try {
                await this._batchMoveTasks(app, text);
            } catch (error) {
                console.log(error);
                app.alert(error);
            }
        },
        "Delete tags in batch": async function (app, text) {
            try {
                await this._batchDeleteTags(app, text);
            } catch (error) {
                console.log(error)
                app.alert(error)
            }
        }
    },

    noteOption: {
        "Tag tasks in batch": async function (app, noteUUID) {
            try {
                const taskNames = await this._transformTaskIntoText(app, noteUUID);
                await this._batchTagTasks(app, taskNames);
            } catch (err) {
                console.log(err);
                app.alert(err);
            }
        },
        "Move tasks in batch": async function (app, noteUUID) {
            try {
                const taskNames = await this._transformTaskIntoText(app, noteUUID);
                await this._batchMoveTasks(app, taskNames);
            } catch (error) {
                console.log(error)
                app.alert(error)
            }
        },
        "Delete tags in batch": async function (app, noteUUID) {
            try {
                const taskNames = await this._transformTaskIntoText(app, noteUUID);
                await this._batchDeleteTags(app, taskNames);
            } catch (error) {
                console.log(error)
                app.alert(error)
            }
        }
    },

    async _batchTagTasks(app, text) {
        const systemNotes = await app.filterNotes();
        const tasksToTag = await this._transformTextIntoTaskArray(app, text);

        const inlineTag = await app.prompt("Choose an inline tag", {
            inputs: [
                { label: 'Inline tag selection', type: 'note', options: systemNotes }
            ]
        });

        if (!inlineTag) throw new Error("Inline tag field cannot be empty");

        console.log('Inline tag to add:\n');
        console.log(inlineTag)

        // Add the tag to the task name
        await Promise.all(tasksToTag.map(async task => {
            const newtaskName = ` ${task.content} \n[${inlineTag.name}](https://www.amplenote.com/notes/${inlineTag.uuid})`;
            await app.updateTask(task.uuid, { content: newtaskName });
        }));

        console.log('Tasks tagged successfully!');
    },

    async _batchMoveTasks(app, text) {
        const systemNotes = await app.filterNotes();
        const tasksToMove = await this._transformTextIntoTaskArray(app, text);

        const targetNote = await app.prompt("Choose a note", {
            inputs: [
                { label: 'Target note', type: 'note', options: systemNotes }
            ]
        });

        if (!targetNote) throw new Error("Target note cannot be empty");

        console.log("Note to move tasks to: ")
        console.log(targetNote);


        // Move tasks to target note
        await Promise.all(tasksToMove.map(async task => {
            const noteUUID = targetNote.uuid;
            await app.updateTask(task.uuid, { noteUUID: noteUUID })
            console.log(task);
        }));
    },

    async _batchDeleteTags(app, text) {
        const taskArray = await this._transformTextIntoTaskArray(app, text);
        let NoteUUIDs = [];

        //Get all possible inline tags from the selected tasks
        taskArray.map(task => {
        
            //Replaces the whole task name with only the noteUUID
            const noteLink = task.content.match(/\((.*?)\)/g).map(match => match.slice(1, -1));
            noteLink.forEach(link => {
                const uuid = link.match(/\/([^\/]+)$/)
                NoteUUIDs.push(uuid[1]) //Sends the second matching group, as the first has a weird "/"
            })
        }); 
        
        //Gets only the unique UUIDs
        NoteUUIDs = [...new Set(NoteUUIDs)]

        
        //Gets the note and transforms it into an object similar to the select type
        let tagOptions = await Promise.all(NoteUUIDs.map(async note => {
            note = await app.findNote( { uuid: note })

            const object = {
                label: note.name,
                value: `[${note.name}](https://www.amplenote.com/notes/${note.uuid})`
            }
            return object;
        }))        

        console.log('NoteUUIDs of the inline tags:');
        console.log(tagOptions);

        const selectedTag = await app.prompt("Choose an inline tag to remove", {
            inputs: [
                { label: 'Inline tag selection', type: 'select', options: tagOptions }
            ]
        });

        if (!selectedTag) throw new Error("Inline tag cannot be empty");

        //Delete the selected tag from the tasks
        await Promise.all(taskArray.map(async task => {
            if (task.content.includes(selectedTag)) {
                const newTaskContent = task.content.replace(selectedTag, "");
                console.log('new task name: ' + newTaskContent)
                await app.updateTask(task.uuid, { content: newTaskContent });
            }
        }))

        console.log('Inline tag removed!');
    },

    async _transformTaskIntoText(app, noteUUID) {
        const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
        if (!noteTasks) throw new Error("Current note has no tasks");

        // Transform the noteTasks into an object array to match the inputs prompt
        const taskOptions = noteTasks.map(task => ({
            label: task.content,
            type: 'checkbox'
        }));

        const selectedTasks = await app.prompt('Select the tasks you want to act on', {
            inputs: taskOptions
        });

        if (!selectedTasks) throw new Error("Choose at least one tasks in order to proceed");

        // Add all of the task names into a single variable to send to the function
        let taskNames = '';

        for (let i = 0; i < selectedTasks.length; i++) {
            if (!selectedTasks[i])
                continue;

            let count = i;

            let rightTask = taskOptions.find(el => {
                if (count == 0) return true;
                count--;
            });

            if (rightTask && rightTask.label) {
                let contentToAdd = rightTask.label;

                // Removes new lines
                contentToAdd = contentToAdd.replace(/\\[\r\n]+/g, ' ');

                // Removes the links if there are any
                contentToAdd = contentToAdd.replace(/(?:__|[*#])|\[(.*?)\]\(.*?\)/gm, '$1');

                taskNames += `${contentToAdd}\n`;
                console.log(contentToAdd);
            }
        }

        taskNames = taskNames.trim();

        return taskNames;
    },

    async _transformTextIntoTaskArray(app, text) {
        const noteUUID = app.context.noteUUID;
        const noteTasks = await app.getNoteTasks({ uuid: noteUUID });

        if (!noteTasks) throw new Error("Choose at least one tasks in order to proceed");

        const textTaskArray = text.split('\n')

        const taskArray = noteTasks.filter(task => {
            
            //Task content without newlines
            let taskContent = task.content.replace(/\\[\r\n]+/g, ' ');

            //Removes the links if there are any. This is to ensure the functionality works
            taskContent = taskContent.replace(/(?:__|[*#])|\[(.*?)\]\(.*?\)/gm, '$1');

            for (let i = 0; i < textTaskArray.length; i++) {
                if (taskContent.includes(textTaskArray[i].trim())) {
                    return task;
                }
            }
            return false;
        })

        console.log('Chosen tasks:')
        console.log(taskArray);
        return taskArray;
    }
}

export default plugin;
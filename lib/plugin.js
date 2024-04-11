    // eslint-disable-next-line no-unused-vars
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
            "Move tasks in batch": async function(app, noteUUID) {
                try {
                    const taskNames = await this._transformTaskIntoText(app, noteUUID);
                    await this._batchMoveTasks(app, taskNames);
                } catch (error) {
                    console.log(error)
                    app.alert(error)
                }
            }
        },

        async _batchTagTasks(app, text) {
            const selectedTasks = text.split('\n');
            console.log('All tasks to tag:\n')
            console.log(selectedTasks);

            const noteUUID = await app.context.noteUUID;
            const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
            const systemNotes = await app.filterNotes();

            const inlineTag = await app.prompt("Choose an inline tag", {
                inputs: [
                    { label: 'Inline tag selection', type: 'note', options: systemNotes }
                ]
            });

            console.log('Inline tag to add:\n');
            console.log(inlineTag)

            const tasksToTag = noteTasks.filter(task => {

                //Task content without newlines
                let taskContent = task.content.replace(/\\[\r\n]+/g, ' ');

                //Removes the links if there are any. This is to ensure the functionality works
                taskContent = taskContent.replace(/(?:__|[*#])|\[(.*?)\]\(.*?\)/gm, '$1');

                console.log('Task content without link:\n');
                console.log(taskContent);

                for (let i = 0; i < selectedTasks.length; i++) {
                    if (taskContent.includes(selectedTasks[i].trim())) {
                        return task;
                    }
                }
                return false;
            })

            console.log('Tasks to tag:\n');
            console.log(tasksToTag);


            // Add the tag to the task name
            await Promise.all(tasksToTag.map(async task => {
                const newtaskName = ` ${task.content} [${inlineTag.name}](https://www.amplenote.com/notes/${inlineTag.uuid})`;
                await app.updateTask(task.uuid, { content: newtaskName });
            }));

            console.log('Tasks tagged successfully!');
        },

        async _batchMoveTasks(app, text) {
            const selectedTasks = text.split('\n');
            console.log('All tasks to move:\n')
            console.log(selectedTasks);

            const currentNote = await app.context.noteUUID;
            const systemNotes = await app.filterNotes();
            const currentNoteTasks = await app.getNoteTasks({ uuid: currentNote })

            const targetNote = await app.prompt("Choose a note", {
                inputs: [
                    { label: 'Target note', type: 'note', options: systemNotes }
                ]
            });

            console.log("Note to move tasks to: ")
            console.log(targetNote.uuid);

            //Pegar tarefas selecionadas
            const tasksToMove = currentNoteTasks.filter(task => {
                
                //Task content without newlines
                let taskContent = task.content.replace(/\\[\r\n]+/g, ' ');

                //Removes the links if there are any. This is to ensure the functionality works
                taskContent = taskContent.replace(/(?:__|[*#])|\[(.*?)\]\(.*?\)/gm, '$1');
                //Removes escape characters, if there are nay
                taskContent = taskContent.replace(/\\/g, "");
                console.log('Task content without link:\n');
                console.log(taskContent);

                for (let i = 0; i < selectedTasks.length; i++) {
                    if (taskContent.includes(selectedTasks[i].trim())) {
                        return task;
                    }
                }

                return false;
            });

            console.log("Tasks found to move:")
            console.log(tasksToMove);

            // Move tasks to target note
        await Promise.all(tasksToMove.map(async task => {
            const noteUUID = targetNote.uuid;
            await app.updateTask(task.uuid, { noteUUID: noteUUID })
            console.log(task);
        }));
        },

        async _transformTaskIntoText(app, noteUUID) {
            const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
        
            // Transform the noteTasks into an object array to match the inputs prompt
            const taskOptions = noteTasks.map(task => ({
                label: task.content,
                type: 'checkbox'
            }));
        
            const selectedTasks = await app.prompt('Select the tasks you want to act on', {
                inputs: taskOptions
            });
        
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
        }
    }
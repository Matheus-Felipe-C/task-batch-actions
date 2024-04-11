const note = {
    async noteOption(app, noteUUID) {
        const targetNote = '8dbea880-7985-11ee-9046-0e396c8fc4bc'; //Change to any note UUID you want
        const tasks = await app.getNoteTasks({ uuid: noteUUID });
        
        console.log('Before changes:')
        console.log(tasks);

        await Promise.all(tasks.map(async task => {

            const taskUUID = task.uuid;
            console.log(taskUUID);
            const oldTask = await app.getTask(taskUUID);
            
            console.log('Old task');
            console.log(oldTask)

            await app.updateTask(task.uuid, { noteUUID: targetNote });
            
            const newTask = await app.getTask(task.uuid);
            console.log('New task');
            console.log(newTask)
            
        }));
    },

    async replaceText(app, text) {
        const currentNote = await app.context.noteUUID;
        const targetNote = '033ba01a-629c-11ed-bf97-aec53b9d6759'; //Change to any note UUID you want
        const tasks = await app.getNoteTasks({ uuid: currentNote });

        console.log('Before changes');
        console.log(tasks);

        await Promise.all(tasks.map(async task => {
            await app.updateTask(task.taskUUID, { noteUUID: targetNote });
        }));

        console.log('After changes:')
        console.log(tasks);
    }
}
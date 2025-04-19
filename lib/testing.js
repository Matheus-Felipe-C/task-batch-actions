(() => {
  // testing.js
  var plugin = {
    noteOption: {
      "Tag tasks in batch": async function(app, noteUUID) {
        try {
          const tasks = this._getTasksFromNote(app, noteUUID);
          await this._batchTagTasks(app, tasks);
        } catch (error) {
          console.log(error);
        }
      }
    },
    async _batchTagTasks(app, tasks) {
      const systemNotes = await app.filterNotes();
      console.log("Tasks to tag:");
      console.log(tasks);
      const inlineTag = await app.prompt("Choose an inline tag", {
        inputs: [
          { label: "Inline tag selection", type: "note", options: systemNotes }
        ]
      });
      if (!inlineTag)
        throw new Error("Inline tag field cannot be empty");
      console.log("Inline tag to add:\n");
      console.log(inlineTag);
      await Promise.all(tasks.map(async (task) => {
        const newtaskName = ` ${task.content}
[${inlineTag.name}](https://www.amplenote.com/notes/${inlineTag.uuid})`;
        await app.updateTask(task.uuid, { content: newtaskName });
      }));
      console.log("Tasks tagged successfully!");
    },
    async _getTasksFromNote(app, noteUUID) {
      const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
      if (!noteTasks)
        throw new Error("Current note has no tasks");
      const taskOptions = noteTasks.map((task) => ({
        label: task.content,
        type: "checkbox"
      }));
      const inputTasks = await app.prompt("Select the tasks you want to act on", {
        inputs: taskOptions
      });
      if (!inputTasks)
        throw new Error("Choose at least one tasks in order to proceed");
      const selectedTasks = noteTasks.filter((task) => {
        for (let i = 0; i < selectedTasks.length; i++) {
          if (task.content.includes(selectedTasks[i])) {
            return true;
          }
        }
        return false;
      });
      return selectedTasks;
    }
  };
  var testing_default = plugin;
})();

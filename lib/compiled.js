(() => {
  // plugin.js
  var plugin = {
    replaceText: {
      "Tag tasks in batch": async function(app, text) {
        try {
          await this._batchTagTasks(app, text);
        } catch (err) {
          console.log(err);
          app.alert(err);
        }
      },
      "Move tasks in batch": async function(app, text) {
        try {
          await this._batchMoveTasks(app, text);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      },
      "Delete tags in batch": async function(app, text) {
        try {
          await this._batchDeleteTags(app, text);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      }
    },
    noteOption: {
      "Tag tasks in batch": async function(app, noteUUID) {
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
          console.log(error);
          app.alert(error);
        }
      },
      "Delete tags in batch": async function(app, noteUUID) {
        try {
          const taskNames = await this._transformTaskIntoText(app, noteUUID);
          await this._batchDeleteTags(app, taskNames);
        } catch (error) {
          console.log(error);
          app.alert(error);
        }
      }
    },
    async _batchTagTasks(app, text) {
      const systemNotes = await app.filterNotes();
      const tasksToTag = await this._transformTextIntoTaskArray(app, text);
      const inlineTag = await app.prompt("Choose an inline tag", {
        inputs: [
          { label: "Inline tag selection", type: "note", options: systemNotes }
        ]
      });
      if (!inlineTag)
        throw new Error("Inline tag field cannot be empty");
      console.log("Inline tag to add:\n");
      console.log(inlineTag);
      await Promise.all(tasksToTag.map(async (task) => {
        const newtaskName = ` ${task.content} [${inlineTag.name}](https://www.amplenote.com/notes/${inlineTag.uuid})`;
        await app.updateTask(task.uuid, { content: newtaskName });
      }));
      console.log("Tasks tagged successfully!");
    },
    async _batchMoveTasks(app, text) {
      const systemNotes = await app.filterNotes();
      const tasksToMove = await this._transformTextIntoTaskArray(app, text);
      const targetNote = await app.prompt("Choose a note", {
        inputs: [
          { label: "Target note", type: "note", options: systemNotes }
        ]
      });
      if (!targetNote)
        throw new Error("Target note cannot be empty");
      console.log("Note to move tasks to: ");
      console.log(targetNote);
      await Promise.all(tasksToMove.map(async (task) => {
        const noteUUID = targetNote.uuid;
        await app.updateTask(task.uuid, { noteUUID });
        console.log(task);
      }));
    },
    async _batchDeleteTags(app, text) {
      const taskArray = await this._transformTextIntoTaskArray(app, text);
      let NoteUUIDs = [];
      taskArray.map((task) => {
        const noteLink = task.content.match(/\((.*?)\)/g).map((match) => match.slice(1, -1));
        noteLink.forEach((link) => {
          const uuid = link.match(/\/([^\/]+)$/);
          NoteUUIDs.push(uuid[1]);
        });
      });
      NoteUUIDs = [...new Set(NoteUUIDs)];
      let tagOptions = await Promise.all(NoteUUIDs.map(async (note) => {
        note = await app.findNote({ uuid: note });
        const object = {
          label: note.name,
          value: `[${note.name}](https://www.amplenote.com/notes/${note.uuid})`
        };
        return object;
      }));
      console.log("NoteUUIDs of the inline tags:");
      console.log(tagOptions);
      const selectedTag = await app.prompt("Choose an inline tag to remove", {
        inputs: [
          { label: "Inline tag selection", type: "select", options: tagOptions }
        ]
      });
      if (!selectedTag)
        throw new Error("Inline tag cannot be empty");
      await Promise.all(taskArray.map(async (task) => {
        if (task.content.includes(selectedTag)) {
          const newTaskContent = task.content.replace(selectedTag, "");
          console.log("new task name: " + newTaskContent);
          await app.updateTask(task.uuid, { content: newTaskContent });
        }
      }));
      console.log("Inline tag removed!");
    },
    async _transformTaskIntoText(app, noteUUID) {
      const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
      if (!noteTasks)
        throw new Error("Current note has no tasks");
      const taskOptions = noteTasks.map((task) => ({
        label: task.content,
        type: "checkbox"
      }));
      const selectedTasks = await app.prompt("Select the tasks you want to act on", {
        inputs: taskOptions
      });
      if (!selectedTasks)
        throw new Error("Choose at least one tasks in order to proceed");
      let taskNames = "";
      for (let i = 0; i < selectedTasks.length; i++) {
        if (!selectedTasks[i])
          continue;
        let count = i;
        let rightTask = taskOptions.find((el) => {
          if (count == 0)
            return true;
          count--;
        });
        if (rightTask && rightTask.label) {
          let contentToAdd = rightTask.label;
          contentToAdd = contentToAdd.replace(/\\[\r\n]+/g, " ");
          contentToAdd = contentToAdd.replace(/(?:__|[*#])|\[(.*?)\]\(.*?\)/gm, "$1");
          taskNames += `${contentToAdd}
`;
          console.log(contentToAdd);
        }
      }
      taskNames = taskNames.trim();
      return taskNames;
    },
    async _transformTextIntoTaskArray(app, text) {
      const noteUUID = app.context.noteUUID;
      const noteTasks = await app.getNoteTasks({ uuid: noteUUID });
      if (!noteTasks)
        throw new Error("Choose at least one tasks in order to proceed");
      const textTaskArray = text.split("\n");
      const taskArray = noteTasks.filter((task) => {
        let taskContent = task.content.replace(/\\[\r\n]+/g, " ");
        taskContent = taskContent.replace(/(?:__|[*#])|\[(.*?)\]\(.*?\)/gm, "$1");
        for (let i = 0; i < textTaskArray.length; i++) {
          if (taskContent.includes(textTaskArray[i].trim())) {
            return task;
          }
        }
        return false;
      });
      console.log("Chosen tasks:");
      console.log(taskArray);
      return taskArray;
    }
  };
  var plugin_default = plugin;
})();

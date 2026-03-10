const express = require("express");
const router = express.Router({ mergeParams: true });
const eventNoteController = require("../controllers/eventNote.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), eventNoteController.listNotes);
router.post(
  "/",
  workspaceMember("owner", "admin", "member"),
  eventNoteController.createNote,
);

router.get("/:noteId", workspaceMember(), eventNoteController.getNote);
router.put(
  "/:noteId",
  workspaceMember("owner", "admin", "member"),
  eventNoteController.updateNote,
);
router.delete(
  "/:noteId",
  workspaceMember("owner", "admin", "member"),
  eventNoteController.deleteNote,
);

module.exports = router;

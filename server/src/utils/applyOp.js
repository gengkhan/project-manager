const isNumber = (n) => typeof n === "number" && !Number.isNaN(n);

/**
 * Apply fortune-sheet ops to MongoDB collection.
 *
 * Each sheet is stored as its own document keyed by { eventId, id }.
 * Ops reference sheets by `id` (fortune-sheet sheet id).
 *
 * Ported from fortune-sheet backend-demo/op.js, adapted for per-event
 * multi-sheet storage with `eventId` scoping.
 *
 * @param {import("mongoose").Model} SheetModel  Mongoose model for sheet docs
 * @param {string} eventId  The parent event ID
 * @param {any[]} ops  Array of Op objects from fortune-sheet
 */
async function applyOp(SheetModel, eventId, ops) {
  const operations = [];

  for (const op of ops) {
    const { path, id } = op;
    const filter = { eventId, id };

    if (op.op === "insertRowCol") {
      // ── Insert rows or columns ──────────────────────
      const field = op.value.type === "row" ? "r" : "c";
      let insertPos = op.value.index;
      if (op.value.direction === "rightbottom") {
        insertPos += 1;
      }
      operations.push({
        updateOne: {
          filter,
          update: {
            $inc: {
              [`celldata.$[e].${field}`]: op.value.count,
            },
          },
          arrayFilters: [{ [`e.${field}`]: { $gte: insertPos } }],
        },
      });
    } else if (op.op === "deleteRowCol") {
      // ── Delete rows or columns ──────────────────────
      const field = op.value.type === "row" ? "r" : "c";
      operations.push(
        // Remove cells in the deleted range
        {
          updateOne: {
            filter,
            update: {
              $pull: {
                celldata: {
                  [field]: {
                    $gte: op.value.start,
                    $lte: op.value.end,
                  },
                },
              },
            },
          },
        },
        // Decrement indexes of cells after the deleted range
        {
          updateOne: {
            filter,
            update: {
              $inc: {
                [`celldata.$[e].${field}`]: -(
                  op.value.end -
                  op.value.start +
                  1
                ),
              },
            },
            arrayFilters: [{ [`e.${field}`]: { $gte: op.value.start } }],
          },
        },
      );
    } else if (op.op === "addSheet") {
      // ── Add a new sheet ─────────────────────────────
      operations.push({
        insertOne: {
          document: { eventId, ...op.value },
        },
      });
    } else if (op.op === "deleteSheet") {
      // ── Delete a sheet ──────────────────────────────
      operations.push({ deleteOne: { filter } });
    } else if (
      path.length >= 3 &&
      path[0] === "data" &&
      isNumber(path[1]) &&
      isNumber(path[2])
    ) {
      // ── Cell update ─────────────────────────────────
      const key = ["celldata.$[e].v", ...path.slice(3)].join(".");
      const [, r, c] = path;
      const options = { arrayFilters: [{ "e.r": r, "e.c": c }] };
      const updater =
        op.op === "remove"
          ? { $unset: { [key]: "" } }
          : { $set: { [key]: op.value } };

      if (path.length === 3) {
        // Full cell value replacement — upsert into celldata if not exists
        const cellExists = await SheetModel.countDocuments(
          {
            ...filter,
            celldata: { $elemMatch: { r, c } },
          },
          { limit: 1 },
        );
        if (cellExists) {
          operations.push({
            updateOne: { filter, update: updater, ...options },
          });
        } else {
          operations.push({
            updateOne: {
              filter,
              update: {
                $addToSet: {
                  celldata: { r, c, v: op.value },
                },
              },
            },
          });
        }
      } else {
        operations.push({
          updateOne: { filter, update: updater, ...options },
        });
      }
    } else if (path.length === 2 && path[0] === "data" && isNumber(path[1])) {
      // Entire row assignment — not supported
      console.error("row assigning not supported");
    } else if (path.length === 0 && op.op === "add") {
      // Add new sheet (alternate format)
      operations.push({
        insertOne: { document: { eventId, ...op.value } },
      });
    } else if (path[0] !== "data") {
      // ── Other config updates (column widths, freeze, etc.) ──
      if (op.op === "remove") {
        operations.push({
          updateOne: {
            filter,
            update: { $unset: { [op.path.join(".")]: "" } },
          },
        });
      } else {
        operations.push({
          updateOne: {
            filter,
            update: { $set: { [op.path.join(".")]: op.value } },
          },
        });
      }
    } else {
      console.error("unprocessable op", op);
    }
  }

  if (operations.length > 0) {
    await SheetModel.bulkWrite(operations);
  }
}

module.exports = { applyOp };

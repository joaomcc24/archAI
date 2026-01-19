# Task: Generate task.md from Architecture Documentation

## 🎯 Goal
Allow users to describe a feature they want to build, and automatically generate a structured `task.md` implementation plan based on their existing architecture.md.

---

## ✅ Requirements
- User has an existing project with architecture.md snapshot.
- User enters a feature description (e.g., "Add user settings page").
- Backend uses LLM to generate step-by-step task.md.
- Task is stored and viewable/downloadable in UI.

---

## 🧩 Steps

### **Step 1: TaskService**
- Create `TaskService.ts` in backend services.
- Implement `generateTask(snapshotId, featureDescription)` method.
- Use LLM to generate structured task.md from architecture context.
- Write unit test for service.

### **Step 2: Task API Endpoint**
- Add `POST /api/projects/:id/task` endpoint.
- Accept `{ description, snapshotId }` in body.
- Call TaskService and return generated task.
- Add route tests.

### **Step 3: Database Schema**
- Add `tasks` table to store generated tasks.
- Columns: id, project_id, snapshot_id, description, markdown, created_at.

### **Step 4: Task Generation UI**
- Add "Generate Task" button on snapshot page.
- Show modal/form for feature description input.
- Call API and show loading state.

### **Step 5: Task Display Page**
- Create `/task/[id]` page to view generated task.
- Include copy/download functionality.
- Link from snapshot page.

### **Step 6: Add Tests**
- Unit tests for TaskService.
- Integration tests for task endpoint.
- Ensure error handling works.

---

## 🔬 Testing Strategy
Each step must include:
- Unit tests for any new services.
- Integration tests after major pipeline steps.
- Manual verification in local environment.

---

## 🧠 Done When
- User can enter feature description.
- Task.md is generated based on architecture context.
- Task is stored and viewable in UI.
- All tests pass.

---

## 📦 Next Feature (after this one)
- Snapshot History with diff comparison
- Multi-repo support

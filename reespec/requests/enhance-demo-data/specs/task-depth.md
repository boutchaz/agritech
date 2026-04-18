# Spec: Task Depth

## Capability
After seeding, tasks have comments, dependencies, equipment, and templates — all connected via real FK IDs.

### Scenario: Task comments reference tasks, users, and workers
- **GIVEN** demo data has been seeded
- **WHEN** querying `task_comments` joined with `tasks` and `workers`
- **THEN** at least 4 comments exist, each with a valid `task_id` → existing task and `user_id` → existing user. At least 1 comment has a `worker_id` → existing worker. Comment `type` uses valid enum values (comment, status_update, completion_note, issue).

### Scenario: Task dependencies link two real tasks
- **GIVEN** demo data has been seeded
- **WHEN** querying `task_dependencies` joined with tasks on both `task_id` and `depends_on_task_id`
- **THEN** at least 2 dependencies exist, both FKs point to different existing tasks, `dependency_type` is a valid enum, and the dependency makes agronomic sense (e.g., fertilization finish_to_start harvest)

### Scenario: Task equipment references real tasks
- **GIVEN** demo data has been seeded
- **WHEN** querying `task_equipment` joined with `tasks`
- **THEN** at least 3 equipment entries exist, each with valid `task_id`, realistic `equipment_name`, and `condition_before`/`condition_after` using valid enum values

### Scenario: Task templates reference real task categories
- **GIVEN** demo data has been seeded
- **WHEN** querying `task_templates` joined with `task_categories`
- **THEN** at least 3 templates exist, each with a valid `category_id` pointing to a category created in step 34

-- The only workouts index (009) covers (user_id, created_at) — but almost
-- every query that matters filters/orders on started_at instead:
-- workoutService.list/listPublic, userService.exportData, and every
-- analyticsService function (getSummary, getWeeklyVolumeHistory,
-- getMuscleGroupDistribution, getWorkoutHeatmap, recommendRoutine). None of
-- those can use the existing index, so they fall back to a per-user
-- sequential scan filtered by date on some of the most frequently hit
-- endpoints (dashboard, analytics tab).
CREATE INDEX idx_workouts_user_started ON workouts(user_id, started_at DESC);

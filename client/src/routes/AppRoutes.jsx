import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import Layout from '../components/layout/Layout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Courses from '../pages/Courses';
import CourseDetail from '../pages/CourseDetail';
import Timetable from '../pages/Timetable';
import Assignments from '../pages/Assignments';
import Announcements from '../pages/Announcements';
import Events from '../pages/Events';
import StudyGroups from '../pages/StudyGroups';
import GroupDetail from '../pages/GroupDetail';
import Notes from '../pages/Notes';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageUsers from '../pages/admin/ManageUsers';
import ManageCourses from '../pages/admin/ManageCourses';
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="events" element={<Events />} />
          <Route path="groups" element={<StudyGroups />} />
          <Route path="groups/:groupId" element={<GroupDetail />} />
          <Route path="notes" element={<Notes />} />

          <Route element={<RoleRoute roles={['ADMIN']} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<ManageUsers />} />
            <Route path="admin/courses" element={<ManageCourses />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
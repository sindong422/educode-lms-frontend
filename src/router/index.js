import { createRouter, createWebHistory } from 'vue-router'
import LearningInterface from '../views/LearningInterface.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/student/course'
        },
        {
            path: '/student/course',
            name: 'student-course',
            component: LearningInterface
        },
        {
            path: '/teacher/course',
            name: 'teacher-course',
            component: () => import('../views/teacher/TeacherCourseView.vue')
        }
    ]
})

export default router

'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Users, Settings, ChevronRight, Activity, X, AlertCircle, CheckCircle, Info, Search, UserPlus, FileText, LogOut } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function TeamNotificationSystem() {
  // Router
  const router = useRouter();
  
  // State management
  const [teams, setTeams] = useState([
    { id: 1, name: 'Engineering', members: 8, status: 'active', students: [] },
    { id: 2, name: 'Marketing', members: 5, status: 'active', students: [] },
    { id: 3, name: 'Product', members: 6, status: 'inactive', students: [] },
    { id: 4, name: 'Design', members: 4, status: 'active', students: [] },
  ]);
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [activeSection, setActiveSection] = useState('teams');
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const notificationRef = useRef(null);
  const audioContextRef = useRef(null);
  const pusherRef = useRef(null);// Filter teams based on search query
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.students.some(student => 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.tokenNumber && student.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Team Management Dashboard</h1>
          
          <div className="flex items-center space-x-4">
            {/* Notification bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full hover:bg-indigo-600 relative"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {/* Notification panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-10 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold">Notifications</h3>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Clear all
                    </button>
                  </div>
                  
                  {notifications.length > 0 ? (
                    <div>
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b hover:bg-gray-50 flex items-start ${
                            notification.type === 'error' ? 'border-l-4 border-l-red-500' :
                            notification.type === 'success' ? 'border-l-4 border-l-green-500' :
                            notification.type === 'warning' ? 'border-l-4 border-l-yellow-500' :
                            'border-l-4 border-l-blue-500'
                          }`}
                        >
                          <div className="mr-3 mt-1">
                            {notification.type === 'error' && <AlertCircle size={16} className="text-red-500" />}
                            {notification.type === 'success' && <CheckCircle size={16} className="text-green-500" />}
                            {notification.type === 'warning' && <AlertCircle size={16} className="text-yellow-500" />}
                            {notification.type === 'info' && <Info size={16} className="text-blue-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{notification.message}</p>
                            {notification.details && (
                              <p className="text-xs text-gray-500 mt-1">{notification.details}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Audio indicator */}
            <div className="text-xs bg-indigo-800 px-2 py-1 rounded">
              {isAudioUnlocked ? 'Audio: On' : 'Audio: Off'}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md z-10">
          <nav className="pt-5">
            <button
              onClick={() => setActiveSection('teams')}
              className={`w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center ${
                activeSection === 'teams' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : ''
              }`}
            >
              <Users size={18} className="mr-3" />
              <span>Teams & Students</span>
            </button>
            
            <button
              onClick={() => setActiveSection('add-student')}
              className={`w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center ${
                activeSection === 'add-student' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : ''
              }`}
            >
              <UserPlus size={18} className="mr-3" />
              <span>Add Student</span>
            </button>
            
            <button
              onClick={() => setActiveSection('import-csv')}
              className={`w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center ${
                activeSection === 'import-csv' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : ''
              }`}
            >
              <FileText size={18} className="mr-3" />
              <span>Import CSV</span>
            </button>
            
            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center ${
                activeSection === 'settings' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-700' : ''
              }`}
            >
              <Settings size={18} className="mr-3" />
              <span>Settings</span>
            </button>
            
            <div className="border-t mt-5 pt-5">
              <button
                onClick={() => {
                  // In production, add your logout logic here
                  router.push('/login');
                }}
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center"
              >
                <LogOut size={18} className="mr-3" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
          
          {/* Test controls (for demo only - remove in production) */}
          <div className="absolute bottom-0 left-0 w-64 bg-gray-100 p-3 border-t">
            <p className="text-xs text-gray-500 mb-2 font-semibold">Test Controls (Demo Only)</p>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={testAddStudent}
                className="py-1 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                Test Add Student
              </button>
              <button 
                onClick={testChangeTeamStatus}
                className="py-1 px-2 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
              >
                Test Status Change
              </button>
              <button 
                onClick={testAudioAnnouncement}
                className="py-1 px-2 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              >
                Test Audio
              </button>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {activeSection === 'teams' && (
            <div>
              <div className="flex justify-between mb-6 items-center">
                <h1 className="text-2xl font-bold text-gray-800">Teams & Students</h1>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search teams or students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : filteredTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeams.map(team => (
                    <div 
                      key={team.id} 
                      className={`bg-white rounded-lg shadow-md overflow-hidden border-t-4 ${
                        team.status === 'active' ? 'border-green-500' : 'border-gray-300'
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-semibold text-gray-800">{team.name}</h2>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            team.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {team.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="mb-4">
                          <span className="text-sm text-gray-600">
                            {team.members} {team.members === 1 ? 'Member' : 'Members'}
                          </span>
                        </div>
                        
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Team Members</h3>
                          
                          <div className="max-h-64 overflow-y-auto pr-1">
                            {team.students.length > 0 ? (
                              <div className="space-y-2">
                                {team.students.map(student => (
                                  <div key={student.id} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-sm">{student.name}</p>
                                      <div className="flex space-x-2 mt-1">
                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                                          {student.batch}
                                        </span>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                                          {student.category}
                                        </span>
                                        {student.tokenNumber && (
                                          <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                                            {student.tokenNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <button 
                                      onClick={() => handleRemoveStudent(team.id, student.id)}
                                      className="text-gray-400 hover:text-red-500"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No students assigned yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 px-5 py-3 border-t flex justify-between items-center">
                        <button
                          onClick={() => setSelectedTeam(team)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                        >
                          View Details
                          <ChevronRight size={16} className="ml-1" />
                        </button>
                        
                        <button
                          onClick={() => handleTeamUpdate(team.id, { status: team.status === 'active' ? 'inactive' : 'active' })}
                          className={`px-3 py-1.5 rounded text-xs font-medium ${
                            team.status === 'active' 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {team.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <p className="text-gray-500">No teams found</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'add-student' && (
            <div className="max-w-md mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Student</h1>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <form onSubmit={e => {
                  e.preventDefault();
                  // Add your form submission logic here
                  addNotification({
                    type: 'success',
                    message: 'Student added successfully!',
                    id: `student-add-${Date.now()}`
                  });
                }} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Student name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. 2023, 2024, etc."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">Select Category</option>
                        <option value="senior">Senior</option>
                        <option value="junior">Junior</option>
                        <option value="subjunior">Subjunior</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Token Number</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. T12345"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Team</label>
                      <select
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Select Team (Optional) --</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Add Student
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === 'import-csv' && (
            <div className="max-w-md mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Import Students (CSV)</h1>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <form onSubmit={e => {
                  e.preventDefault();
                  // Add your CSV import logic here
                  addNotification({
                    type: 'success',
                    message: 'CSV imported successfully!',
                    id: `csv-import-${Date.now()}`
                  });
                }} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV File</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <FileText className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                              <span>Upload a file</span>
                              <input id="file-upload" name="file-upload" type="file" accept=".csv" className="sr-only" />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">CSV file up to 10MB</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Info className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Your CSV should include headers: name, batch, category, tokenNumber
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Import Students
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {activeSection === 'settings' && (
            <div className="max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Notifications</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Audio Announcements</h3>
                        <p className="text-sm text-gray-500">Enable voice announcements for team updates</p>
                      </div>
                      <button 
                        onClick={() => setIsAudioUnlocked(!isAudioUnlocked)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                          isAudioUnlocked ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          isAudioUnlocked ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Real-time Updates</h3>
                          <p className="text-sm text-gray-500">Enable automatic updates without page refresh</p>
                        </div>
                        <button className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-indigo-600">
                          <span className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 translate-x-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">System</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Clear Notification History</h3>
                      <button
                        onClick={() => {
                          setNotifications([]);
                          addNotification({
                            type: 'info',
                            message: 'Notification history cleared',
                            id: `clear-notifications-${Date.now()}`
                          });
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Clear History
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Test Notifications</h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                          onClick={() => addNotification({
                            type: 'success',
                            message: 'This is a success notification',
                            id: `test-success-${Date.now()}`
                          })}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Test Success
                        </button>
                        
                        <button
                          onClick={() => addNotification({
                            type: 'error',
                            message: 'This is an error notification',
                            details: 'Additional error details here',
                            id: `test-error-${Date.now()}`
                          })}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Test Error
                        </button>
                        
                        <button
                          onClick={() => addNotification({
                            type: 'warning',
                            message: 'This is a warning notification',
                            id: `test-warning-${Date.now()}`
                          })}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          Test Warning
                        </button>
                        
                        <button
                          onClick={() => addNotification({
                            type: 'info',
                            message: 'This is an info notification',
                            id: `test-info-${Date.now()}`
                          })}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Test Info
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}  // Notification management functions
  const addNotification = (notification) => {
    const id = notification.id || Date.now();
    setNotifications(prevNotifications => {
      // Check if notification with same ID already exists
      const existingIndex = prevNotifications.findIndex(n => n.id === id);
      
      if (existingIndex !== -1) {
        // Replace existing notification
        const newNotifications = [...prevNotifications];
        newNotifications[existingIndex] = { ...notification, id, timestamp: new Date() };
        return newNotifications;
      } else {
        // Add new notification
        return [
          { ...notification, id, timestamp: new Date() },
          ...prevNotifications
        ].slice(0, 50); // Keep only the latest 50 notifications
      }
    });
    
    // Play sound for important notifications
    if (notification.type === 'success' || notification.type === 'error') {
      playNotificationSound(notification.type);
    }
    
    // For important team updates, also play audio announcement
    if (notification.announce) {
      playAudioAnnouncement(notification.message);
    }
  };
  
  const removeNotification = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  };
  
  const playNotificationSound = (type) => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      // Different sounds for different notification types
      if (type === 'error') {
        oscillator.frequency.value = 300;
        oscillator.type = 'triangle';
        gainNode.gain.value = 0.3;
      } else if (type === 'success') {
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.2;
      } else {
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
      }
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Team management functions
  const handleStudentAdd = (teamId, student) => {
    console.log(`Adding student ${student.name} to team ID ${teamId}`);
    
    setTeams(prevTeams => {
      const updatedTeams = prevTeams.map(team => {
        if (team.id === teamId) {
          // Check if student already exists
          const studentExists = team.students.some(s => s.id === student.id);
          
          if (!studentExists) {
            // Add the student
            const updatedStudents = [...team.students, student];
            
            // Update team with new student
            const updatedTeam = {
              ...team,
              students: updatedStudents,
              members: updatedStudents.length
            };
            
            // Add notification
            const notificationMessage = `${team.name} selected ${student.name} (${student.batch})`;
            addNotification({
              type: 'success',
              message: notificationMessage,
              id: `student-${student.id}-${Date.now()}`,
              announce: true
            });
            
            return updatedTeam;
          }
        }
        return team;
      });
      
      return updatedTeams;
    });
  };
  
  const handleTeamUpdate = (teamId, updates) => {
    console.log(`Updating team ID ${teamId} with:`, updates);
    
    setTeams(prevTeams => {
      const updatedTeams = prevTeams.map(team => {
        if (team.id === teamId) {
          const updatedTeam = { ...team, ...updates };
          
          // Add notification about team update
          addNotification({
            type: 'info',
            message: `Team ${team.name} status updated to ${updates.status || team.status}`,
            id: `team-status-${team.id}-${Date.now()}`
          });
          
          return updatedTeam;
        }
        return team;
      });
      
      return updatedTeams;
    });
  };
  
  const handleRemoveStudent = (teamId, studentId) => {
    setTeams(prevTeams => {
      const updatedTeams = prevTeams.map(team => {
        if (team.id === teamId) {
          const studentToRemove = team.students.find(s => s.id === studentId);
          const updatedStudents = team.students.filter(s => s.id !== studentId);
          
          // Add notification
          if (studentToRemove) {
            addNotification({
              type: 'info',
              message: `Removed ${studentToRemove.name} from ${team.name}`,
              id: `remove-student-${studentId}-${Date.now()}`
            });
          }
          
          return {
            ...team,
            students: updatedStudents,
            members: updatedStudents.length
          };
        }
        return team;
      });
      
      return updatedTeams;
    });
  };
  
  // Test functions for demo purposes (remove in production)
  const testAddStudent = () => {
    const randomTeamIndex = Math.floor(Math.random() * teams.length);
    const team = teams[randomTeamIndex];
    
    if (team) {
      const newStudent = {
        id: Math.floor(Math.random() * 1000) + 400,
        name: `Test Student ${Math.floor(Math.random() * 100)}`,
        batch: '2024',
        category: Math.random() > 0.5 ? 'senior' : 'junior',
        tokenNumber: `TEST${Math.floor(Math.random() * 1000)}`
      };
      
      handleStudentAdd(team.id, newStudent);
    }
  };
  
  const testChangeTeamStatus = () => {
    if (teams.length > 0) {
      const randomTeamIndex = Math.floor(Math.random() * teams.length);
      const team = teams[randomTeamIndex];
      const newStatus = team.status === 'active' ? 'inactive' : 'active';
      
      handleTeamUpdate(team.id, { status: newStatus });
    }
  };
  
  const testAudioAnnouncement = () => {
    playAudioAnnouncement("This is a test announcement for the team notification system");
    addNotification({
      type: 'info',
      message: "Test announcement played",
      id: `test-audio-${Date.now()}`
    });
  };  // Audio announcement system
  useEffect(() => {
    const unlockAudio = () => {
      if (!isAudioUnlocked) {
        try {
          // Create AudioContext for reliable audio playback
          if (window.AudioContext || window.webkitAudioContext) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create and play a silent sound to unlock audio
            const oscillator = audioContextRef.current.createOscillator();
            oscillator.frequency.value = 400;
            oscillator.connect(audioContextRef.current.destination);
            oscillator.start();
            oscillator.stop(audioContextRef.current.currentTime + 0.001);
            console.log('Audio context initialized and unlocked');
          }
          
          // Also initialize SpeechSynthesis as backup
          if ('speechSynthesis' in window) {
            speechSynthesis.speak(new SpeechSynthesisUtterance(''));
            console.log('SpeechSynthesis initialized');
          }
          
          setIsAudioUnlocked(true);
        } catch (error) {
          console.error('Audio initialization error:', error);
          addNotification({
            type: 'error',
            message: 'Failed to initialize audio',
            details: error.message
          });
        }
      }
    };
    
    // Unlock audio on click, touch, or keydown
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, [isAudioUnlocked]);

  // Function to play audio announcement
  const playAudioAnnouncement = (message) => {
    if (!isAudioUnlocked) {
      console.warn('Audio not unlocked yet');
      addNotification({
        type: 'info',
        message: 'Click anywhere to enable audio announcements',
        id: 'audio-unlock-reminder'
      });
      return;
    }

    try {
      // Try Web Speech API
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Try to get a good voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          v.name.includes('Google') || v.name.includes('Female') || v.lang === 'en-US'
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log('Using voice:', preferredVoice.name);
        }
        
        speechSynthesis.speak(utterance);
        console.log('Speech synthesis triggered for:', message);
      } else {
        console.warn('SpeechSynthesis not supported');
      }
    } catch (error) {
      console.error('Audio announcement error:', error);
    }
  };

  // Setup Pusher and team state updates
  useEffect(() => {
    // Mock function to simulate fetching teams
    const fetchTeams = async () => {
      try {
        setIsLoading(true);
        // Simulate API call - replace with actual API call in production
        // const response = await axios.get('/api/teams/list');
        // setTeams(response.data);
        
        // For demo, we'll just use a timeout to simulate loading
        setTimeout(() => {
          const updatedTeams = [
            { 
              id: 1, 
              name: 'Engineering', 
              members: 8, 
              status: 'active',
              students: [
                { id: 101, name: 'John Smith', batch: '2023', category: 'senior', tokenNumber: 'ENG001' },
                { id: 102, name: 'Sarah Lee', batch: '2023', category: 'senior', tokenNumber: 'ENG002' }
              ]
            },
            { 
              id: 2, 
              name: 'Marketing', 
              members: 5, 
              status: 'active',
              students: [
                { id: 201, name: 'Michael Brown', batch: '2024', category: 'junior', tokenNumber: 'MKT001' }
              ] 
            },
            { 
              id: 3, 
              name: 'Product', 
              members: 6, 
              status: 'inactive',
              students: [] 
            },
            { 
              id: 4, 
              name: 'Design', 
              members: 4, 
              status: 'active',
              students: [
                { id: 301, name: 'Emily Chen', batch: '2023', category: 'senior', tokenNumber: 'DSG001' }
              ] 
            },
          ];
          
          setTeams(updatedTeams);
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Fetch teams error:', err);
        addNotification({
          type: 'error', 
          message: 'Failed to fetch teams', 
          details: err.message
        });
        setIsLoading(false);
      }
    };

    fetchTeams();

    // Setting up mock Pusher-like real-time events for demo
    // In production, replace with actual Pusher implementation
    const mockPusherSetup = () => {
      const interval = setInterval(() => {
        // Randomly simulate a team update
        if (Math.random() > 0.7) {
          const randomEvent = Math.random();
          
          if (randomEvent > 0.5) {
            // Simulate student selection event
            const teamIndex = Math.floor(Math.random() * teams.length);
            const team = teams[teamIndex];
            
            if (team) {
              const newStudent = {
                id: Math.floor(Math.random() * 1000) + 400,
                name: `New Student ${Math.floor(Math.random() * 100)}`,
                batch: '2024',
                category: Math.random() > 0.5 ? 'senior' : 'junior',
                tokenNumber: `T${Math.floor(Math.random() * 1000)}`
              };
              
              handleStudentAdd(team.id, newStudent);
            }
          } else {
            // Simulate team status change
            const teamIndex = Math.floor(Math.random() * teams.length);
            const newStatus = Math.random() > 0.5 ? 'active' : 'inactive';
            
            handleTeamUpdate(teams[teamIndex]?.id, { status: newStatus });
          }
        }
      }, 15000); // Every 15 seconds
      
      return () => clearInterval(interval);
    };
    
    const cleanup = mockPusherSetup();
    return cleanup;
  }, []);

  // Handle outside clicks for notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
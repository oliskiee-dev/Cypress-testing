import React, { useState, useEffect } from "react";
import AdminHeader from '../Component/AdminHeader.jsx';
import UpdateAppointment from './UpdateAppointment';
import ViewReports from './ViewReports';
import { Search, Filter, User, Calendar, Phone, Mail, Clock, CheckCircle, AlertCircle, Send, ChartBar } from 'lucide-react';
import ExpectedStudents from './ExpectedStudents';
import Analytics from "../../utils/analytics";

import './ManagePreRegistration.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function ManagePreRegistration() {
    // State management
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingStatus, setProcessingStatus] = useState(null);
    
    // Confirmation dialog states
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [studentToUpdate, setStudentToUpdate] = useState(null);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [limit, setLimit] = useState(10);

    // Filter and search states
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGrade, setSelectedGrade] = useState("");
    const [selectedStrand, setSelectedStrand] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [expandedRow, setExpandedRow] = useState(null);
    
    // UI state
    const [activeTab, setActiveTab] = useState('table');
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);


    const handleDeleteAllPreRegistrations = async () => {
        if (deleteConfirmText !== 'Confirm') {
            toast.error('Please type "Confirm" to proceed with deletion', {
                position: "top-center",
                autoClose: 3000,
            });
            return;
        }
    
        try {
            setIsDeleting(true);
            
            const response = await fetch('http://localhost:3000/preregistration/deleteAll', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            // Log the activity for deletion
            try {
                const username = localStorage.getItem('username') || 'Admin';
                await fetch("http://localhost:3000/report/add-report", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: username,
                        activityLog: `[Manage Pre-Registration] Deleted all pre-registration records`,
                    }),
                });
            } catch (logError) {
                console.error('Failed to log activity:', logError);
            }
    
            // CSV export logic after deletion
            if (Array.isArray(registrationData) && registrationData.length > 0) {
                const csvRows = [
                    ['Name', 'Phone Number', 'Grade Level', 'Strand', 'Gender', 'Email', 'Student Type', 'Status', 'Registration Date']
                ];
    
                registrationData.forEach(student => {
                    csvRows.push([
                        student.name || '',
                        student.phone_number || '',
                        student.grade_level || '',
                        student.strand || 'N/A',
                        student.gender || '',
                        student.email || '',
                        student.isNewStudent === 'new' ? 'New Student' : 'Returning Student',
                        student.status || '',
                        student.createdAt ? new Date(student.createdAt).toLocaleDateString() : ''
                    ]);
                });
    
                const csvContent = csvRows.map(e => e.join(",")).join("\n");
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `pre_registration_report_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
    
                // Log the export activity
                const username = localStorage.getItem('username') || 'Admin';
                await fetch("http://localhost:3000/report/add-report", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: username,
                        activityLog: `[Manage Pre-Registration: Reports] Pre-registration records exported as CSV on ${new Date().toLocaleString()}`,
                    }),
                });
            }
    
            toast.success(
                <div>
                    <p><strong>Deletion Successful</strong></p>
                    <p>All pre-registration records have been deleted</p>
                </div>,
                {
                    position: "top-center",
                    autoClose: 5000,
                }
            );
    
            // Reset the state and refresh the data
            setShowDeleteConfirmation(false);
            setDeleteConfirmText('');
            fetchStudentData();
        } catch (err) {
            console.error('Failed to delete records:', err);
            toast.error('Failed to delete records. Please try again.', {
                position: "top-center",
                autoClose: 5000,
            });
        } finally {
            setIsDeleting(false);
        }
    };
    

    const DeleteConfirmationDialog = () => {
        if (!showDeleteConfirmation) return null;
        
        // Calculate if input matches required confirmation text
        const isConfirmTextValid = deleteConfirmText === 'Confirm';
        // Check how close user is to typing "Confirm" (for providing feedback)
        const confirmProgress = Math.min(deleteConfirmText.length, 7) / 7;
        
        return (
            <div className="confirmation-overlay">
                <div className="confirmation-dialog">
                    <div className="confirmation-header">
                        <h3>Confirm Deletion</h3>
                    </div>
                    <div className="confirmation-content">
                        <p><strong>Warning:</strong> You are about to delete ALL pre-registration records.</p>
                        <p>This action cannot be undone. All student data will be permanently removed from the system.</p>
                        <p>Type <strong>Confirm</strong> below to proceed:</p>
                        <div className="confirm-input-container">
                            <input
                                type="text"
                                className={`confirm-input ${isConfirmTextValid ? 'valid' : deleteConfirmText.length > 0 ? 'in-progress' : ''}`}
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type 'Confirm' here"
                                autoFocus
                            />
                            {deleteConfirmText.length > 0 && !isConfirmTextValid && (
                                <div className="confirmation-progress">
                                    <div 
                                        className="progress-bar"
                                        style={{ width: `${confirmProgress * 100}%` }}
                                    ></div>
                                </div>
                            )}
                            {deleteConfirmText.length > 0 && (
                                <span className="input-feedback">
                                    {isConfirmTextValid ? (
                                        <span className="valid-text">✓ Ready to delete</span>
                                    ) : (
                                        <span className="invalid-text">Keep typing "Confirm"</span>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="confirmation-actions">
                        <button 
                            className="btn-cancel"
                            onClick={() => {
                                setShowDeleteConfirmation(false);
                                setDeleteConfirmText('');
                            }}
                        >
                            Cancel
                        </button>
                        <button 
                            className={`btn-confirm delete ${isConfirmTextValid ? 'ready' : 'disabled'}`}
                            onClick={handleDeleteAllPreRegistrations}
                            disabled={!isConfirmTextValid || isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <span className="status-loading"></span>
                                    Deleting...
                                </>
                            ) : (
                                'Delete All Records'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    // Fetch data on component mount or when pagination/filters change
    useEffect(() => {
        fetchStudentData();
    }, [currentPage, limit, searchTerm, selectedGrade, selectedStrand, selectedType]);

    const fetchStudentData = async () => {
        try {
            setLoading(true);
            
            // Construct query parameters based on active filters
            let queryParams = new URLSearchParams({
                page: currentPage,
                limit: limit
            });
            
            // Add filters to query parameters if they exist
            if (searchTerm) queryParams.append('search', searchTerm);
            if (selectedGrade) queryParams.append('grade', selectedGrade);
            if (selectedStrand) queryParams.append('strand', selectedStrand);
            if (selectedType) queryParams.append('type', selectedType);
            
            const response = await fetch(
                `http://localhost:3000/preregistration?${queryParams.toString()}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            setStudents(data.preregistration);
            setTotalPages(data.totalPages);
            setTotalRecords(data.totalRecords);
        } catch (err) {
            setError('Failed to fetch student data: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Event handlers
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page when search changes
    };

    const handleGradeChange = (e) => {
        setSelectedGrade(e.target.value);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleStrandChange = (e) => {
        setSelectedStrand(e.target.value);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleTypeChange = (e) => {
        setSelectedType(e.target.value);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    // Open confirmation dialog before status change
    const confirmStatusChange = (studentId, currentStatus) => {
        const student = students.find(s => s._id === studentId);
        setStudentToUpdate({
            id: studentId,
            currentStatus: currentStatus,
            name: student?.name || "this student"
        });
        setShowConfirmation(true);
    };
    
    // Cancel status change
    const cancelStatusChange = () => {
        setShowConfirmation(false);
        setStudentToUpdate(null);
    };

    // Proceed with status change after confirmation
    const handleStatusChange = async () => {
        try {
            if (!studentToUpdate) return;
            
            // Close the confirmation dialog
            setShowConfirmation(false);
            
            // Set the student ID being processed
            setProcessingStatus(studentToUpdate.id);
            
            // The lowercase value to send to the server
            const newStatus = studentToUpdate.currentStatus === "approved" ? "pending" : "approved";
            
            // Update API endpoint to match server code
            const response = await fetch(`http://localhost:3000/preregistration/status/${studentToUpdate.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            Analytics.track('Student Status Changed', {
                previous_status: studentToUpdate.currentStatus,
                new_status: newStatus,
                student_id: studentToUpdate.id
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update the local state immediately without refetching
            setStudents(prevStudents => 
                prevStudents.map(student => 
                    student._id === studentToUpdate.id 
                        ? { ...student, status: newStatus } 
                        : student
                )
            );
            
            // Log the activity if the status was updated
            try {
                // Get the current user's username from localStorage or a global state
                const username = localStorage.getItem('username') || 'Admin'; // Fallback to 'Admin' if not found
                
                await fetch("http://localhost:3000/report/add-report", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: username,
                        activityLog: `[Manage Pre-Registration:Student Records] Updated status for student ${studentToUpdate.name} (ID: ${studentToUpdate.id}) to ${newStatus}`,
                    }),
                });
            } catch (logError) {
                console.error('Failed to log activity:', logError);
                // Don't show toast for this error as it's not critical to the user
            }
            
            // Show notification if email was sent (when approving)
            if (newStatus === "approved" && data.emailSent) {
                const student = students.find(s => s._id === studentToUpdate.id);
                if (student) {
                    toast.success(
                        <div>
                            <p><strong>Approval email sent</strong></p>
                            <p>Notification sent to {student.email}</p>
                        </div>, 
                        {
                            icon: <Send size={16} />,
                            position: "top-center",
                            autoClose: 5000,
                        }
                    );
                }
            }
            
            // Show success toast for status update
            toast.success(
                <div>
                    <p><strong>Status Updated</strong></p>
                    <p>Student status changed to {newStatus}</p>
                </div>,
                {
                    icon: <CheckCircle size={16} />,
                    position: "top-center",
                    autoClose: 3000,
                }
            );
            
        } catch (err) {
            console.error('Failed to update status:', err);
            toast.error('Failed to update status. Please try again.', {
                position: "top-center",
                autoClose: 5000,
            });
            Analytics.track('Status Change Error', {
                error_message: err.message
            });
        } finally {
            setProcessingStatus(null);
            setStudentToUpdate(null);
        }
    };
    

    // Toggle row expansion
    const toggleRow = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };
    
    // Display active filters summary
    const getActiveFiltersText = () => {
        const filters = [];
        
        if (searchTerm) filters.push(`Name: "${searchTerm}"`);
        if (selectedGrade) filters.push(`Grade: ${selectedGrade}`);
        if (selectedStrand) filters.push(`Strand: ${selectedStrand}`);
        if (selectedType) filters.push(`Type: ${selectedType}`);
        
        return filters.length > 0 
            ? `Filtered by: ${filters.join(', ')}` 
            : 'Showing all records';
    };
    
    // Handle viewing student details from appointment tab
    const handleViewStudentDetails = (studentId) => {
        // Find the student index in the array
        const studentIndex = students.findIndex(s => s._id === studentId);
        
        if (studentIndex !== -1) {
            // Set active tab to table view
            setActiveTab('table');
            
            // If we need to navigate to a different page
            const pageForStudent = Math.floor(studentIndex / limit) + 1;
            if (pageForStudent !== currentPage) {
                setCurrentPage(pageForStudent);
            }
            
            // After a short delay to allow for tab switch and possible page change
            setTimeout(() => {
                setExpandedRow(studentIndex % limit);
                
                // Scroll to the student row
                const studentRow = document.getElementById(`student-row-${studentId}`);
                if (studentRow) {
                    studentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add a highlight class temporarily
                    studentRow.classList.add('highlight-row');
                    setTimeout(() => {
                        studentRow.classList.remove('highlight-row');
                    }, 3000);
                }
            }, 300);
        }
    };
    
    // Confirmation Dialog Component
    const ConfirmationDialog = () => {
        if (!showConfirmation) return null;
        
        const newStatus = studentToUpdate?.currentStatus === "approved" ? "Pending" : "Approved";
        const actionText = studentToUpdate?.currentStatus === "approved" ? "change to Pending" : "approve";
        
        return (
            <div className="confirmation-overlay">
                <div className="confirmation-dialog">
                    <div className="confirmation-header">
                        <h3>Confirm Status Change</h3>
                    </div>
                    <div className="confirmation-content">
                        <p>Are you sure you want to {actionText} the status for <strong>{studentToUpdate?.name}</strong>?</p>
                        {studentToUpdate?.currentStatus !== "approved" && (
                            <p>This will send an approval notification email to the student.</p>
                        )}
                    </div>
                    <div className="confirmation-actions">
                        <button className="btn-cancel" onClick={cancelStatusChange}>
                            Cancel
                        </button>
                        <button 
                            className={`btn-confirm ${studentToUpdate?.currentStatus === "approved" ? "pending" : "approved"}`}
                            onClick={handleStatusChange}
                        >
                            {studentToUpdate?.currentStatus === "approved" ? 
                                "Yes, Change to Pending" : 
                                "Yes, Approve Student"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // Table renderer
    const renderTable = () => {
        if (loading) return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading student data...</p>
            </div>
        );
        
        if (error) return (
            <div className="error-state">
                <AlertCircle size={24} />
                <p>{error}</p>
            </div>
        );
        
        if (students.length === 0) return (
            <div className="empty-state">
                <User size={48} />
                <h3>No Records Found</h3>
                <p>No student registration records match your filter criteria.</p>
            </div>
        );

        return (
            <div className="data-table-container">
                <div className="active-filters">
                    <span>{getActiveFiltersText()}</span>
                    {(searchTerm || selectedGrade || selectedStrand || selectedType) && (
                        <button 
                            className="clear-filters-btn"
                            onClick={() => {
                                setSearchTerm("");
                                setSelectedGrade("");
                                setSelectedStrand("");
                                setSelectedType("");
                                setCurrentPage(1);
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
                
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Gender</th>
                                <th>Type</th>
                                <th>Date of Birth</th>
                                <th>Age</th>
                                <th>Grade Level</th>
                                <th>Strand</th>
                                <th>Email Address</th>
                                <th>Phone Number</th>
                                <th>Details</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {students.map((student, index) => {
                                const birthDate = new Date(student.birthdate);
                                const age = new Date().getFullYear() - birthDate.getFullYear();
                                return (
                                    <React.Fragment key={student._id || index}>
                                        <tr 
                                            id={`student-row-${student._id}`}
                                            className={expandedRow === index ? 'row-expanded' : ''}
                                        >
                                            <td className="cell-name" title={student.name}>{student.name}</td>
                                            <td className="cell-center">{student.gender}</td>
                                            <td className="cell-center">{student.isNewStudent}</td>
                                            <td className="cell-center">
                                                {birthDate.toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </td>
                                            <td className="cell-center">{age}</td>
                                            <td className="cell-center">{student.grade_level}</td>
                                            <td className="cell-center">{student.strand || "N/A"}</td>
                                            <td className="cell-email" title={student.email}>
                                                <div className="email-container">
                                                    <Mail size={14} />
                                                    <span>{student.email}</span>
                                                </div>
                                            </td>
                                            <td className="cell-phone" title={student.phone_number}>
                                                <div className="phone-container">
                                                    <Phone size={14} />
                                                    <span>{student.phone_number}</span>
                                                </div>
                                            </td>
                                            <td className="cell-action">
                                                <button
                                                    className="btn-details"
                                                    onClick={() => toggleRow(index)}
                                                >
                                                    <Clock size={14} />
                                                    {expandedRow === index ? 'Hide' : 'View'}
                                                </button>
                                            </td>
                                            <td className="cell-status">
                                            <button
                                                className={`btn-status ${
                                                    processingStatus === student._id 
                                                        ? 'processing' 
                                                        : student.status?.toLowerCase() || 'pending'
                                                }`}
                                                onClick={() => confirmStatusChange(student._id, student.status)}
                                                disabled={processingStatus === student._id}
                                            >
                                                {processingStatus === student._id ? (
                                                    <>
                                                        <span className="status-loading"></span>
                                                        Processing...
                                                    </>
                                                ) : student.status === "approved" ? (
                                                    <><CheckCircle size={14} /> Approved</>
                                                ) : (
                                                    <><AlertCircle size={14} /> Pending</>
                                                )}
                                            </button>
                                        </td>
                                        </tr>
                                        {expandedRow === index && (
                                            <tr className="details-row">
                                                <td colSpan="11">
                                                    <div className="details-content">
                                                        <div className="details-section">
                                                            <h4>Appointment Information</h4>
                                                            <div className="details-grid">
                                                                <div className="details-item">
                                                                    <span className="details-label">Date:</span>
                                                                    <span className="details-value">
                                                                        {student.appointment_date
                                                                            ? new Date(student.appointment_date).toLocaleDateString("en-US", {
                                                                                year: "numeric",
                                                                                month: "long",
                                                                                day: "numeric",
                                                                            })
                                                                            : "Not scheduled"}
                                                                    </span>
                                                                </div>
                                                                <div className="details-item">
                                                                    <span className="details-label">Time:</span>
                                                                    <span className="details-value">{student.preferred_time || "Not specified"}</span>
                                                                </div>
                                                                <div className="details-item">
                                                                    <span className="details-label">Purpose:</span>
                                                                    <span className="details-value">{student.purpose_of_visit || "Not specified"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                <div className="pagination">
                    <button 
                        className="btn-page"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span className="page-info">
                        Page {currentPage} of {totalPages} ({totalRecords} total)
                    </span>
                    <button 
                        className="btn-page"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };
    
    return (
        <div className="manage-preregistration">
            <AdminHeader />
            
            <div className="content-container">
                <div className="page-header">
                    <h1>Student Pre-Registration Management</h1>
                    <p>View and manage student pre-registration records</p>
                </div>
                
                <div className="tabs">
                    <button 
                        className={`tab ${activeTab === "table" ? "active" : ""}`}
                        onClick={() => setActiveTab("table")}
                    >
                        <User size={16} />
                        Student Records
                    </button>
                    <button 
                        className={`tab ${activeTab === "appointment" ? "active" : ""}`}
                        onClick={() => setActiveTab("appointment")}
                    >
                        <Calendar size={16} />
                        Appointment Availability
                    </button>
                    <button 
                        className={`tab ${activeTab === "reports" ? "active" : ""}`}
                        onClick={() => setActiveTab("reports")}
                    >
                        <ChartBar size={16} />
                        Reports
                    </button>

                    <button 
                        className={`tab ${activeTab === "expected" ? "active" : ""}`}
                        onClick={() => setActiveTab("expected")}
                    >
                        <CheckCircle size={16} />
                        Expected Students
                    </button>

                </div>
                
                
                {activeTab === "table" && (
                    <>
                        <div className="filters-container">
                            <div className="search-container">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by student name..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="search-input"
                                />
                            </div>
                            <div className="filter-group">
                                <Filter size={16} />
                                <select value={selectedGrade} onChange={handleGradeChange} className="filter-select">
                                    <option value="">All Grades</option>
                                    <option value="Kinder">Kinder</option>
                                    <option value="1">Grade 1</option>
                                    <option value="2">Grade 2</option>
                                    <option value="3">Grade 3</option>
                                    <option value="4">Grade 4</option>
                                    <option value="5">Grade 5</option>
                                    <option value="6">Grade 6</option>
                                    <option value="7">Grade 7</option>
                                    <option value="8">Grade 8</option>
                                    <option value="9">Grade 9</option>
                                    <option value="10">Grade 10</option>
                                    <option value="11">Grade 11</option>
                                    <option value="12">Grade 12</option>
                                </select>

                                <select value={selectedStrand} onChange={handleStrandChange} className="filter-select">
                                    <option value="">All Strands</option>
                                    <option value="ABM">ABM</option>
                                    <option value="STEM">STEM</option>
                                    <option value="HUMSS">HUMSS</option>
                                </select>
                                <select value={selectedType} onChange={handleTypeChange} className="filter-select">
                                    <option value="">All Types</option>
                                    <option value="new">New</option>
                                    <option value="old">Old</option>
                                </select>
                            </div>
                        </div>
                        
                        {renderTable()}
                        <div className="danger-zone-section">
                        <h3>Database Management</h3>
                        <div className="danger-zone-container">
                            <div className="danger-zone-warning">
                            <AlertCircle size={24} />
                            <div className="danger-zone-text">
                                <h4>Danger Zone</h4>
                                <p>The following action will permanently delete all student pre-registration records from the database. This action cannot be undone.</p>
                            </div>
                            </div>
                            <button 
                            className="btn-danger-zone"
                            onClick={() => setShowDeleteConfirmation(true)}
                            >
                            Delete All Records
                            </button>
                        </div>
                        </div>
                    </>
                )}
                
                {activeTab === "expected" && <ExpectedStudents />}
                {activeTab === "appointment" && (
                    <UpdateAppointment 
                        studentData={students}
                        onViewStudentDetails={handleViewStudentDetails}
                        onSetActiveTab={(tab) => setActiveTab(tab)}
                    />
                )}

                {activeTab === "reports" && (
                    <ViewReports 
                        studentData={students}
                        totalRecords={totalRecords}
                    />
                )}
            </div>
            <DeleteConfirmationDialog />
            {/* Confirmation Dialog */}
            <ConfirmationDialog />
            
            {/* Toast notifications container */}
            <ToastContainer />
        </div>
    );
}

export default ManagePreRegistration;
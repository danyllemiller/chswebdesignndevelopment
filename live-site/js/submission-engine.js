import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// HostGator Upload Endpoint
const HOSTGATOR_UPLOAD_URL = "https://digitalartsclasses.com/upload.php";

/**
 * Uploads a file to HostGator and automatically grades it based on the curriculum context.
 * UPDATED: Now accepts targetAssignment to prevent "random" chapter assignments.
 * @param {File} file - The file to upload.
 * @param {string} studentId - The student's ID (e.g., '8011569').
 * @param {Object} firebaseApp - The initialized Firebase App object.
 * @param {string} appId - Your custom app ID (e.g., 'dac-exam-system').
 * @param {string} targetAssignment - The specific assignment name (e.g. "Ch 4" or "Unit 1 Exam").
 * @param {Function} onProgress - Callback for progress updates (percentage).
 * @param {Function} onSuccess - Callback when upload and grading are complete.
 * @param {Function} onError - Callback if something fails.
 */
export async function uploadAndGradeSubmission(file, studentId, firebaseApp, appId, targetAssignment, onProgress, onSuccess, onError) {
    if (!file || !studentId) {
        if(onError) onError(new Error("Missing file or student ID."));
        return;
    }

    const db = getFirestore(firebaseApp);
    
    // 1. Package the file for HostGator
    const formData = new FormData();
    formData.append("studentId", studentId);
    // Use targetAssignment as the folder name on the server if provided
    formData.append("assignment", targetAssignment || "Submission"); 
    formData.append("file", file);
    formData.append("path", file.webkitRelativePath || file.name);

    // 2. Start the Upload to HostGator
    const xhr = new XMLHttpRequest();
    xhr.open('POST', HOSTGATOR_UPLOAD_URL, true);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            if(onProgress) onProgress(progress);
        }
    };

    xhr.onload = async function() {
        if (xhr.status === 200) {
            try {
                const result = JSON.parse(xhr.responseText);
                if(result.success) {
                    
                    // 3. Determine Gradebook Entry Name
                    // Priority: Provided targetAssignment > Filename
                    const assignmentKey = targetAssignment || file.name;
                    const lowerName = assignmentKey.toLowerCase();
                    
                    // 4. SYNCED POINT CALCULATION
                    // We check the assignment name for point overrides [XX pts]
                    const ptsMatch = assignmentKey.match(/\[(\d+)\s*pts?\]/i);
                    let maxPoints = 100;

                    if (ptsMatch) {
                        maxPoints = parseInt(ptsMatch[1]);
                    } else if (lowerName.includes('lab') || lowerName.includes('ch ')) {
                        maxPoints = 25; // Standard chapter-based point value
                    } else if (lowerName.includes('pre-test') || lowerName.includes('pretest')) {
                        maxPoints = 10;
                    } else if (lowerName.includes('post-test') || lowerName.includes('assessment')) {
                        maxPoints = 20;
                    }
                    
                    let finalScore = 0;
                    
                    // Determine auto-grading logic based on assignment category
                    if (lowerName.includes('milestone') || lowerName.includes('project') || lowerName.includes('exam') || lowerName.includes('test')) {
                        finalScore = 0; // High-stakes items wait for manual teacher review
                    } else {
                        finalScore = maxPoints; // Labs and Notes get automatic full points
                    }
                    
                    // 5. Write to Gradebook in Firestore
                    const gradeRef = doc(db, 'artifacts', appId, 'public', 'data', 'grades', studentId);
                    await setDoc(gradeRef, {
                        [assignmentKey]: {
                            score: finalScore,
                            max: maxPoints,
                            timestamp: new Date().toISOString()
                        }
                    }, { merge: true });
                    
                    console.log(`Auto-graded ${assignmentKey} successfully! Score: ${finalScore}/${maxPoints}`);
                    if(onSuccess) onSuccess();

                } else {
                    throw new Error(result.message || "Server rejected upload.");
                }
            } catch (err) {
                console.error("Failed to process upload or grade:", err);
                if(onError) onError(err);
            }
        } else {
            if(onError) onError(new Error("HostGator server error during upload."));
        }
    };
    
    xhr.onerror = function() {
        if(onError) onError(new Error("Upload failed due to network error."));
    };

    xhr.send(formData);
}
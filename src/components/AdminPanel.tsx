import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "reports" | "actions">("users");
  const [blockReason, setBlockReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const users = useQuery(api.admin.getAllUsers, { limit: 50 }) ?? [];
  const reports = useQuery(api.admin.getReports, {}) ?? [];
  const pendingActions = useQuery(api.admin.getPendingActions) ?? [];


  const toggleUserBlock = useMutation(api.admin.toggleUserBlock);
  const updateReportStatus = useMutation(api.admin.updateReportStatus);
  const reviewAdminAction = useMutation(api.admin.reviewAdminAction);

  const handleBlockUser = async (userId: string, currentlyBlocked: boolean) => {
    if (!blockReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    try {
      await toggleUserBlock({
        userId: userId as any,
        reason: blockReason,
      });

      toast.success(currentlyBlocked ? "User unblocked" : "User blocked");
      setBlockReason("");
      setSelectedUserId(null);
    } catch (error) {
      toast.error("Failed to update user status");
      console.error(error);
    }
  };

  const handleReportAction = async (reportId: string, status: "reviewed" | "resolved", action?: string) => {
    try {
      await updateReportStatus({
        reportId: reportId as any,
        status,
        adminAction: action,
      });

      toast.success("Report updated");
    } catch (error) {
      toast.error("Failed to update report");
      console.error(error);
    }
  };

  const handleActionReview = async (actionId: string, approved: boolean, notes?: string) => {
    try {
      await reviewAdminAction({
        actionId: actionId as any,
        approved,
        notes,
      });

      toast.success(approved ? "Action approved" : "Action rejected");
    } catch (error) {
      toast.error("Failed to review action");
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Panel</h1>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: "users", label: "Users", count: users?.length },
          { id: "reports", label: "Reports", count: reports?.filter(r => r.status === "pending").length },
          { id: "actions", label: "Pending Actions", count: pendingActions?.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${activeTab === tab.id
                ? "bg-white text-primary shadow-sm"
                : "text-gray-600 hover:text-gray-800"
              }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">User Management</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reports</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users?.map((user) => (
                  <tr key={user._id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm">👤</span>
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">Age {user.age}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isBlocked
                          ? "bg-red-100 text-red-800"
                          : user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                        {user.isBlocked ? "Blocked" : user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.matchCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.reportCount}</td>
                    <td className="px-4 py-3">
                      {selectedUserId === user._id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Reason..."
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            className="px-2 py-1 text-sm border rounded"
                          />
                          <button
                            onClick={() => handleBlockUser(user._id, user.isBlocked)}
                            className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-hover"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setSelectedUserId(null)}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedUserId(user._id)}
                          className={`px-3 py-1 text-sm rounded ${user.isBlocked
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">User Reports</h2>
          </div>

          <div className="space-y-4 p-4">
            {reports?.map((report) => (
              <div key={report._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">
                      {report.reporterName} reported {report.reportedName}
                    </h3>
                    <p className="text-sm text-gray-600">Reason: {report.reason}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(report.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${report.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : report.status === "reviewed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}>
                    {report.status}
                  </span>
                </div>

                <p className="text-gray-700 mb-3">{report.description}</p>

                {report.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReportAction(report._id, "reviewed", "Under investigation")}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      Mark as Reviewed
                    </button>
                    <button
                      onClick={() => handleReportAction(report._id, "resolved", "No action needed")}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Actions Tab */}
      {activeTab === "actions" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Pending Admin Actions</h2>
          </div>

          <div className="space-y-4 p-4">
            {pendingActions?.map((action) => (
              <div key={action._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">
                      {action.adminName} wants to {action.action} {action.targetName}
                    </h3>
                    <p className="text-sm text-gray-600">Reason: {action.reason}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(action.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleActionReview(action._id, true)}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleActionReview(action._id, false, "Action denied")}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

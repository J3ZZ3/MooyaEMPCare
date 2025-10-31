const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface AclPolicy {
  owner: string;
  visibility: "public" | "private";
}

// Alias for ObjectAclPolicy
export interface ObjectAclPolicy extends AclPolicy {}

export class ObjectAcl {
  /**
   * Check if user can access object based on ACL policy
   */
  static canAccess(userId: string | undefined, policy: AclPolicy, requestedPermission: "read" | "write"): boolean {
    // Public objects are always readable
    if (policy.visibility === "public" && requestedPermission === "read") {
      return true;
    }

    // Private objects require authentication and ownership
    if (policy.visibility === "private") {
      return userId === policy.owner;
    }

    return false;
  }

  /**
   * Default ACL policy for new uploads
   */
  static defaultPolicy(owner: string): AclPolicy {
    return {
      owner,
      visibility: "private",
    };
  }
}

// Export the ACL_POLICY_METADATA_KEY for use in storage implementations
export { ACL_POLICY_METADATA_KEY };

// Note: The Google Cloud Storage-specific functions (setObjectAclPolicy, getObjectAclPolicy, canAccessObject)
// have been removed as we no longer use Google Cloud Storage. If needed, they can be re-implemented
// for specific storage backends (R2, Replit Object Storage, etc.) in their respective modules.

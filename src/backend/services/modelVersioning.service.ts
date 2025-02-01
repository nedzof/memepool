import { AerospikeService } from './aerospikeService';
import { config } from '../../shared/config/constants';

interface ModelVersion {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  createdAt: Date;
}

export class ModelVersioningService {
  private aerospike = new AerospikeService();
  private readonly namespace = config.AEROSPIKE_NAMESPACE;
  private readonly modelSet = 'model_versions';

  async registerVersion(version: Omit<ModelVersion, 'id' | 'createdAt'>) {
    const versionId = `v${Date.now()}`;
    const fullVersion: ModelVersion = {
      ...version,
      id: versionId,
      createdAt: new Date()
    };

    await this.aerospike.createMetadata(`model_${versionId}`, fullVersion);
    return versionId;
  }

  async activateVersion(versionId: string) {
    const versions = await this.aerospike.client.query(this.namespace, this.modelSet)
      .where('isActive', true)
      .execute();

    // Deactivate current active versions
    for (const version of versions) {
      await this.aerospike.updateMetadata(version.key, { isActive: false });
    }

    // Activate new version
    await this.aerospike.updateMetadata(`model_${versionId}`, { isActive: true });
  }

  async getActiveVersion() {
    const versions = await this.aerospike.client.query(this.namespace, this.modelSet)
      .where('isActive', true)
      .limit(1)
      .execute();

    return versions[0] as ModelVersion | undefined;
  }
}

export const modelVersioningService = new ModelVersioningService(); 
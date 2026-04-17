import { Client } from '@elastic/elasticsearch';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

let esClient = null;

export function getEsClient() {
  if (!esClient) {
    esClient = new Client({
      node: config.elasticsearch.node,
      auth: config.elasticsearch.auth.password
        ? { username: config.elasticsearch.auth.username, password: config.elasticsearch.auth.password }
        : undefined,
    });
  }
  return esClient;
}

const JOB_INDEX = 'xinpin_jobs';

/**
 * 初始化岗位索引
 */
export async function initJobIndex() {
  const client = getEsClient();
  try {
    const exists = await client.indices.exists({ index: JOB_INDEX });
    if (!exists) {
      await client.indices.create({
        index: JOB_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                ik_smart: { type: 'custom', tokenizer: 'ik_smart' },
                ik_max_word: { type: 'custom', tokenizer: 'ik_max_word' },
              },
            },
          },
          mappings: {
            properties: {
              uuid: { type: 'keyword' },
              company_id: { type: 'long' },
              title: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart' },
              description: { type: 'text', analyzer: 'ik_max_word' },
              category: { type: 'keyword' },
              industry: { type: 'keyword' },
              city: { type: 'keyword' },
              district: { type: 'keyword' },
              salary_min: { type: 'integer' },
              salary_max: { type: 'integer' },
              salary_type: { type: 'keyword' },
              welfare: { type: 'keyword' },
              is_urgent: { type: 'boolean' },
              published_at: { type: 'date' },
              expired_at: { type: 'date' },
              location: { type: 'geo_point' },
              status: { type: 'keyword' },
            },
          },
        },
      });
      logger.info(`ES index ${JOB_INDEX} created`);
    }
  } catch (err) {
    logger.warn('ES index init failed (ES may not be available)', { error: err.message });
  }
}

/**
 * 索引单个岗位
 */
export async function indexJob(job) {
  const client = getEsClient();
  try {
    await client.index({
      index: JOB_INDEX,
      id: job.id,
      body: {
        uuid: job.uuid,
        company_id: job.company_id,
        title: job.title,
        description: job.description,
        category: job.category,
        industry: job.industry,
        city: job.city,
        district: job.district,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_type: job.salary_type,
        welfare: job.welfare ? JSON.parse(job.welfare) : [],
        is_urgent: !!job.is_urgent,
        published_at: job.published_at,
        expired_at: job.expired_at,
        location: job.latitude && job.longitude
          ? { lat: job.latitude, lon: job.longitude }
          : undefined,
        status: job.status,
      },
    });
  } catch (err) {
    logger.warn('ES indexJob failed', { error: err.message });
  }
}

/**
 * 搜索岗位
 */
export async function searchJobs({ keyword, city, industry, salary_min, salary_max, page = 1, size = 20 }) {
  const client = getEsClient();
  try {
    const must = [{ term: { status: 'active' } }];
    const filter = [];

    if (keyword) {
      must.push({
        multi_match: {
          query: keyword,
          fields: ['title^3', 'description', 'category'],
          type: 'best_fields',
        },
      });
    }

    if (city) filter.push({ term: { city } });
    if (industry) filter.push({ term: { industry } });
    if (salary_min) filter.push({ range: { salary_max: { gte: salary_min } } });
    if (salary_max) filter.push({ range: { salary_min: { lte: salary_max } } });

    const result = await client.search({
      index: JOB_INDEX,
      body: {
        from: (page - 1) * size,
        size,
        query: { bool: { must, filter } },
        sort: [
          { is_urgent: { order: 'desc' } },
          { _score: { order: 'desc' } },
          { published_at: { order: 'desc' } },
        ],
      },
    });

    return {
      total: result.hits.total.value,
      list: result.hits.hits.map(h => ({ ...h._source, _score: h._score })),
    };
  } catch (err) {
    logger.warn('ES searchJobs failed, fallback to MySQL', { error: err.message });
    return null; // 返回 null 让调用方 fallback 到 MySQL
  }
}

/**
 * 删除岗位索引
 */
export async function removeJobIndex(jobId) {
  const client = getEsClient();
  try {
    await client.delete({ index: JOB_INDEX, id: jobId });
  } catch (err) {
    // ignore
  }
}

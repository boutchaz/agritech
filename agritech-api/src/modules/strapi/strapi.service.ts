import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class StrapiService {
    private readonly logger = new Logger(StrapiService.name);
    private readonly apiUrl: string;
    private readonly apiToken: string;

    constructor(private configService: ConfigService) {
        this.apiUrl = this.configService.get<string>('STRAPI_API_URL', 'http://localhost:1337/api');
        this.apiToken = this.configService.get<string>('STRAPI_API_TOKEN', '');

        if (!this.apiToken) {
            this.logger.warn('STRAPI_API_TOKEN is not set. Content fetching may fail.');
        }
    }

    async findOne(contentType: string, params: any = {}) {
        try {
            const response = await axios.get(`${this.apiUrl}/${contentType}`, {
                params,
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                },
            });
            return response.data;
        } catch (error) {
            this.logger.error(`Error fetching ${contentType} from Strapi`, error.message);
            return null;
        }
    }

    async findMany(contentType: string, params: any = {}) {
        try {
            const response = await axios.get(`${this.apiUrl}/${contentType}`, {
                params,
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                },
            });
            return response.data;
        } catch (error) {
            this.logger.error(`Error fetching ${contentType} list from Strapi`, error.message);
            return { data: [], meta: {} };
        }
    }

    async getProductByListingId(listingId: string) {
        const result = await this.findMany('marketplace-products', {
            filters: {
                listing_id: {
                    $eq: listingId
                }
            },
            populate: ['mainImage', 'categories', 'seo']
        });

        return result.data && result.data.length > 0 ? result.data[0] : null;
    }
}

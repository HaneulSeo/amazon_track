import brandTrend from "../../public/data/monthly_brand_trend.json";
import productTrend from "../../public/data/monthly_product_trend.json";
import products from "../../public/data/products.json";
import summary from "../../public/data/summary.json";
import type { BrandTrend, Product, ProductTrend, Summary } from "./types";

export const monthlyBrandTrend = brandTrend as BrandTrend[];
export const monthlyProductTrend = productTrend as ProductTrend[];
export const productsData = products as Product[];
export const summaryData = summary as Summary;

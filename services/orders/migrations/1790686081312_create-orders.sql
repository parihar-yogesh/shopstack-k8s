-- Up Migration

CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status      TEXT        NOT NULL DEFAULT 'placed'
                            CHECK (status IN ('placed', 'shipped', 'cancelled')),
    total_cents INTEGER     NOT NULL CHECK (total_cents >= 0),
    currency    TEXT        NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id         UUID    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id       BIGINT  NOT NULL,
    sku              TEXT    NOT NULL,
    name             TEXT    NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (order_id, product_id)
);

CREATE INDEX orders_user_id_created_at_idx ON orders (user_id, created_at DESC);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);

-- Down Migration

DROP TABLE order_items;
DROP TABLE orders;
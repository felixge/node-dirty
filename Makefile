test:
	find test/test-*.js | xargs -n 1 -t node

benchmark:
	find benchmark/*.js | xargs -n 1 -t node
	
.PHONY: test benchmark